use scrypto::blueprints::consensus_manager::TimePrecision;
use scrypto::prelude::*;

#[derive(ScryptoSbor, NonFungibleData, Clone, Debug)]
pub struct CurrentVote {
    pub yes_votes: u64,
    pub no_votes: u64,
    pub name: String,
    pub end: Instant,
}

#[derive(ScryptoSbor, NonFungibleData, Debug)]
pub struct Member {
    #[mutable]
    voted_in: HashSet<String>,
}

#[derive(ScryptoSbor, radix_engine_common::ManifestSbor, Debug)]
pub enum VoteChoice {
    Yes,
    No,
}

#[blueprint]
mod vote {
    enable_method_auth! {
        roles {
            admin => updatable_by: [OWNER];
        },
        methods {
            become_member => restrict_to: [admin];
            new_vote => restrict_to: [admin];
            // TODO add member role
            vote => PUBLIC;
            end_vote => PUBLIC;
        }
    }

    pub struct Vote {
        /// Name of the organization for which this component will be
        /// organizing votes.
        org_name: String,
        current_vote: Option<CurrentVote>,
        member_badge: ResourceManager,
        admin_badge: ResourceManager,
        component_badge: Vault,
        pub vote_results: Vault,
    }

    impl Vote {
        /// Returns the component address and a bucket containing the
        /// admin badge for the organization
        pub fn instantiate_vote(org_name: String) -> (Global<Vote>, Bucket) {
            let admin_bucket: Bucket = ResourceBuilder::new_fungible(OwnerRole::None)
                .divisibility(DIVISIBILITY_NONE)
                .metadata(metadata!(
                    init {
                        "name" => format!("{org_name} Admin"), locked;
                    }
                ))
                .mint_initial_supply(1);

            let component_badge: Bucket = ResourceBuilder::new_fungible(OwnerRole::None)
                .divisibility(DIVISIBILITY_NONE)
                .metadata(metadata!(
                    init {
                        "name" => format!("{org_name} Component"), locked;
                        }
                ))
                .mint_initial_supply(1);

            let require_admin = rule!(require(admin_bucket.resource_address()));
            let require_component = rule!(require(component_badge.resource_address()));

            let org_name_char = org_name
                .chars()
                .nth(0)
                .expect("The organization name should not be empty.");

            let member_badge: ResourceManager =
                ResourceBuilder::new_ruid_non_fungible::<Member>(OwnerRole::None)
                    .metadata(metadata!(
                    init {
                        "name" => format!("{org_name} Member"), locked;
                        "symbol" => format!("{}M", org_name_char), locked;
                        }
                    ))
                    .mint_roles(mint_roles!(
                        minter => require_component.clone();
                        minter_updater => require_admin.clone();
                    ))
                    .burn_roles(burn_roles!(
                        burner => require_admin.clone();
                        burner_updater => require_admin.clone();
                    ))
                    .recall_roles(recall_roles!(
                        recaller => rule!(deny_all);
                        recaller_updater => rule!(deny_all);
                    ))
                    .deposit_roles(deposit_roles!(
                        depositor => require_admin.clone();
                        depositor_updater => require_admin.clone();
                    ))
                    .non_fungible_data_update_roles(non_fungible_data_update_roles!(
                        non_fungible_data_updater => require_component.clone();
                        non_fungible_data_updater_updater => require_admin.clone();
                    ))
                    .create_with_no_initial_supply();

            let vote_badge: ResourceManager =
                ResourceBuilder::new_ruid_non_fungible::<CurrentVote>(OwnerRole::None)
                    .metadata(metadata!(
                        init {
                            "name" => format!("{org_name} Result"), locked;
                            "symbol" => format!("{}V", org_name_char), locked;
                        }
                    ))
                    .mint_roles(mint_roles!(
                        minter => require_component.clone();
                        minter_updater => require_component.clone();
                    ))
                    .create_with_no_initial_supply();

            let component = Self {
                member_badge,
                org_name,
                current_vote: None,
                admin_badge: admin_bucket.resource_manager(),
                component_badge: Vault::with_bucket(component_badge),
                vote_results: Vault::new(vote_badge.address()),
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::None)
            .roles(roles!(
                admin => require_admin.clone();
            ))
            .metadata(metadata!(
                init {
                    "name" => format!("My Vote"), locked;
                }
            ))
            .globalize();

            (component, admin_bucket)
        }

        pub fn become_member(&self) -> Bucket {
            self.component_badge
                .as_fungible()
                .authorize_with_amount(dec!(1), || {
                    self.member_badge.mint_ruid_non_fungible(Member {
                        voted_in: HashSet::new(),
                    })
                })
        }

        /// Duration is given in minutes
        pub fn new_vote(&mut self, name: String, duration: i64) {
            assert!(self.current_vote.is_none(), "Vote is already in progress");
            assert!(duration > 0, "Must have a positive duration");
            let end = Clock::current_time_rounded_to_minutes()
                .add_minutes(duration)
                .expect("Error calculating end time");
            self.current_vote = Some(CurrentVote {
                yes_votes: 0,
                no_votes: 0,
                name,
                end,
            });
        }

        pub fn vote(&mut self, choice: VoteChoice, member_proof: Proof) {
            let current_vote = self.current_vote.as_mut().expect("No vote in progress");
            assert!(
                Clock::current_time_is_strictly_before(current_vote.end, TimePrecision::Minute),
                "Vote has expired"
            );

            let validater_member = member_proof
                .check(self.member_badge.address())
                .as_non_fungible()
                .non_fungible_local_id();
            let mut member_data = self
                .member_badge
                .get_non_fungible_data::<Member>(&validater_member);

            assert!(
                !member_data.voted_in.contains(&current_vote.name),
                "Member has already voted"
            );

            member_data.voted_in.insert(current_vote.name.clone());

            self.component_badge
                .as_fungible()
                .authorize_with_amount(
                    dec!(1),
                    || {
                        self.member_badge.update_non_fungible_data(
                            &validater_member,
                            "voted_in",
                            member_data.voted_in,
                        );
                    },
                );

            match choice {
                VoteChoice::Yes => current_vote.yes_votes += 1,
                VoteChoice::No => current_vote.no_votes += 1,
            };
        }

        pub fn end_vote(&mut self) {
            let current_vote = self.current_vote.as_ref().expect("No vote in progress");
            assert!(
                Clock::current_time_is_at_or_after(current_vote.end, TimePrecision::Minute),
                "Vote has not ended"
            );
            let vote_result = self
                .component_badge
                .as_fungible()
                .authorize_with_amount(
                    dec!(1),
                    || {
                        let vote_badge: ResourceManager = self.vote_results.resource_manager();
                        vote_badge.mint_ruid_non_fungible(current_vote.clone())
                    },
                );

            // let vote_result = self.component_badge.authorize(|| {
            //     borrow_resource_manager!(self.vote_results.resource_address())
            //         .mint_uuid_non_fungible(current_vote.clone())
            // });
            //
            self.current_vote = None;
            self.vote_results.put(vote_result);
        }
    }
}
