use crate::test_lib::TestLib;
use radix_engine::blueprints::resource::NON_FUNGIBLE_RESOURCE_MANAGER_DATA_STORE;
use radix_engine::system::system::{FieldSubstate, KeyValueEntrySubstate};
use radix_engine::transaction::TransactionReceipt;
use radix_engine_store_interface::db_key_mapper::{MappedSubstateDatabase, SpreadPrefixKeyMapper};
use radix_engine_stores::memory_db::InMemorySubstateDatabase;
use scrypto::{blueprints::consensus_manager::TimePrecision, prelude::*};
use scrypto_unit::*;
use simple_vote::{vote::Vote, CurrentVote, VoteChoice};
use transaction::builder::ManifestBuilder;
use transaction::prelude::TransactionManifestV1;

mod test_lib;

struct VoteTest {
    runner: TestRunner,
    admin_public_key: Secp256k1PublicKey,
    admin_account: ComponentAddress,
    resources: HashMap<String, ResourceAddress>,
    component_badge: ResourceAddress,
    admin_badge: ResourceAddress,
    member_badge: ResourceAddress,
    vote_results_addr: ResourceAddress,
    vote_component: ComponentAddress,
}

impl VoteTest {
    pub fn new() -> Self {

        // Setup the environment
        let mut test_runner = TestRunner::builder()
            .with_custom_genesis(CustomGenesis::default(
                Epoch::of(1),
                CustomGenesis::default_consensus_manager_config(),
            ))
            .without_trace()
            .build();

        let (admin_public_key, admin_private_key, admin_account) =
            test_runner.new_allocated_account();

        let vote_package_address = test_runner.compile_and_publish(this_package!());

        let manifest = ManifestBuilder::new()
            .call_function(
                vote_package_address,
                "Vote",
                "instantiate_vote",
                manifest_args!("Test"),
            )
            .deposit_batch(admin_account)
            .build();

        let receipt = test_runner.execute_manifest_ignoring_fee(
            manifest,
            vec![NonFungibleGlobalId::from_public_key(&admin_public_key)],
        );

        let vote_component = receipt.expect_commit(true).new_component_addresses()[0];
        let rs = receipt.expect_commit(true).new_resource_addresses();

        let mut resources = HashMap::new();
        for addr in rs {
            let name = test_runner
                .get_metadata(GlobalAddress::from(addr.clone()), "name")
                .expect("Name metadata key should be present");
            let name_str = match name {
                MetadataValue::String(n) => n,
                _ => panic!("Resource 'name' metadata is of wrong type"),
            };
            resources.insert(name_str, addr.clone());
        }

        let component_badge = resources.get("Test Component").unwrap();
        let admin_badge = resources.get("Test Admin").unwrap();
        let member_badge = resources.get("Test Member").unwrap();
        let vote_results_addr = resources.get("Test Result").unwrap();

        Self {
            runner: test_runner,
            admin_public_key,
            admin_account,
            vote_component,
            component_badge: component_badge.clone(),
            admin_badge: admin_badge.clone(),
            member_badge: member_badge.clone(),
            vote_results_addr: vote_results_addr.clone(),
            resources,
        }
    }

    fn become_member_manifest(&mut self, member_addr: ComponentAddress) -> TransactionManifestV1 {
        ManifestBuilder::new()
            .call_method(
                self.admin_account,
                "create_proof_of_amount",
                manifest_args!(self.admin_badge, dec!("1")),
            )
            .call_method(self.vote_component, "become_member", manifest_args!())
            .call_method(
                member_addr,
                "deposit_batch",
                manifest_args!(ManifestExpression::EntireWorktop),
            )
            .build()
    }

    fn new_vote_manifest(&mut self, name: &str, duration: i64) -> TransactionManifestV1 {
        ManifestBuilder::new()
            .call_method(
                self.admin_account,
                "create_proof_of_amount",
                manifest_args!(self.admin_badge, dec!("1")),
            )
            .call_method(
                self.vote_component,
                "new_vote",
                manifest_args!(name, duration),
            )
            .build()
    }

    fn vote_manifest(
        &mut self,
        member_addr: ComponentAddress,
        choice: VoteChoice,
    ) -> TransactionManifestV1 {
        let vaults = self
            .runner
            .get_component_vaults(member_addr, self.member_badge);
        match self
            .runner
            .inspect_non_fungible_vault(vaults.get(0).unwrap().clone())
        {
            Some((_, Some(rid))) => {
                let mut s = BTreeSet::new();
                s.insert(rid);
                println!("s: {:?}", s);
                let mut p: Proof;
                ManifestBuilder::new()
                    .call_method(
                        member_addr,
                        "create_proof_of_non_fungibles",
                        manifest_args!(self.member_badge, s),
                    )
                    .pop_from_auth_zone("proof")
                    .clone_proof("proof", "proof1")
                    .push_to_auth_zone("proof1")
                    .call_method_with_name_lookup(
                        self.vote_component,
                        "vote",
                        |lookup| (choice, lookup.proof("proof"))
                    )
                    .build()
            }
            _ => panic!("No non fungible vault found"),
        }
    }

    fn end_vote_manifest(&mut self) -> TransactionManifestV1 {
        ManifestBuilder::new()
            .call_method(self.vote_component, "end_vote", manifest_args!())
            .build()
    }


    fn get_component_state<T: ScryptoDecode>(
        self: &VoteTest,
        component_address: ComponentAddress,
    ) -> T {
        let store = self.runner.substate_db();
        let node_id: &NodeId = component_address.as_node_id();
        let partition_number = MAIN_BASE_PARTITION;
        let substate_key: &SubstateKey = &ComponentField::State0.into();

        let component_state = store.get_mapped::<SpreadPrefixKeyMapper, FieldSubstate<T>>(
            node_id,
            partition_number,
            substate_key,
        );
        component_state.unwrap().value.0
    }

    fn get_non_fungible_data<T: NonFungibleData>(
        self: &VoteTest,
        resource: ResourceAddress,
        non_fungible_id: NonFungibleLocalId,
    ) -> T {
        let store = self.runner.substate_db();
        let collection_index = NON_FUNGIBLE_RESOURCE_MANAGER_DATA_STORE;
        let node_id: &NodeId = resource.as_node_id();
        let partition_number = MAIN_BASE_PARTITION
            .at_offset(PartitionOffset(1 + collection_index))
            .unwrap();
        let substate_key: &SubstateKey = &SubstateKey::Map(non_fungible_id.to_key());

        let substate = store.get_mapped::<SpreadPrefixKeyMapper, KeyValueEntrySubstate<T>>(
            node_id,
            partition_number,
            substate_key,
        );
        substate.unwrap().value.unwrap()
    }
}

#[test]
fn test_vote_happy_path() {
    // INSTANTIATE
    let mut test = VoteTest::new();

    let expected_resource_names =
        vec!["Test Admin", "Test Component", "Test Member", "Test Result"];
    assert!(
        expected_resource_names
            .iter()
            .all(|&res| { test.resources.get(res).is_some() }),
        "Unexpected new resources, expected resources: {:?}\nbut got {:?}",
        expected_resource_names,
        test.resources
    );

    let vote_resources = test.runner.get_component_resources(test.vote_component);
    assert_eq!(
        vote_resources.get(&test.component_badge),
        Some(dec!("1")).as_ref()
    );
    assert_eq!(
        vote_resources.get(&test.vote_results_addr),
        // Some(dec!("0")).as_ref()
        None
    );

    assert_eq!(
        test.runner
            .account_balance(test.admin_account, test.admin_badge.clone()),
        Some(dec!("1")),
    );

    let (user1_public_key, user1_private_key, user1_account) = test.runner.new_allocated_account();

    let admin_global_id = NonFungibleGlobalId::from_public_key(&test.admin_public_key);
    let user1_global_id = NonFungibleGlobalId::from_public_key(&user1_public_key);

    // BECOME MEMBER
    let manifest = test.become_member_manifest(user1_account);
    let r = test.runner.execute_manifest_ignoring_fee(
        manifest,
        vec![admin_global_id.clone(), user1_global_id.clone()],
    );

    assert_eq!(
        test.runner
            .account_balance(user1_account, test.member_badge.clone()),
        Some(dec!("1")),
    );

    // NEW VOTE
    let vote_start = test.runner.get_current_time(TimePrecision::Minute);
    let duration = 5i64;
    let manifest = test.new_vote_manifest("Test Vote", duration);
    test.runner
        .execute_manifest_ignoring_fee(manifest, vec![admin_global_id.clone()])
        .expect_commit_success();

    // VOTE
    let manifest = test.vote_manifest(user1_account, VoteChoice::Yes);
    let receipt = test.runner
        .execute_manifest_ignoring_fee(manifest, vec![user1_global_id.clone()]);
        // .expect_commit_success();

    let cr = receipt.expect_commit_success();
    // println!("receipt: {:?}", cr);

    // DOUBLE VOTE ATTEMPT
    let manifest = test.vote_manifest(user1_account, VoteChoice::Yes);
    let receipt = test
        .runner
        .execute_manifest_ignoring_fee(manifest, vec![user1_global_id.clone()]);
    // TestLib::expect_error_log(&receipt, "Member has already voted");
    receipt.expect_commit_failure();

    // END VOTE
    println!("epoch before set: {:?}", test.runner.get_current_epoch());
    let round = test.runner.get_consensus_manager_state().round;
    test.runner.advance_to_round_at_timestamp(
        Round::of(round.number() + 1),
        vote_start
            .add_minutes(duration)
            .expect("Could not make new time")
            .seconds_since_unix_epoch
            * 1000,
    );
    // test.runner.set_current_epoch(
    //     Epoch::of(
    //     (vote_start
    //         .add_minutes(duration)
    //         .expect("Could not make new time")
    //         .seconds_since_unix_epoch
    //         * 1000).to_u64().unwrap()) // Needs milliseconds
    // );
    println!("epoch after set: {:?}", test.runner.get_current_epoch());
    let manifest = test.end_vote_manifest();
    test.runner
        .execute_manifest_ignoring_fee(manifest, vec![admin_global_id.clone()])
        .expect_commit_success();

    let vote_state = test.get_component_state::<Vote>(test.vote_component);

    let vote_result_vault_node = vote_state.vote_results.0;
    println!("vote_result_vault_node: {:?}", vote_result_vault_node);

    let vote_ids = test
        .runner
        .inspect_non_fungible_vault(vote_result_vault_node.0)
        .expect("Vote result vault not found");
    println!("vote_ids: {:?}", vote_ids.clone().1.unwrap());
    let d = test.get_non_fungible_data::<CurrentVote>(test.vote_results_addr, vote_ids.1.unwrap());
    println!("d: {:?}", d);
    // assert_eq!(vote_ids.len(), 1);

    // let vote_result_id = vote_result_ids.first().unwrap();
    // let vote_result = test
    //     .lib
    //     .get_non_fungible_data::<CurrentVote>(&test.vote_results_addr, vote_result_id);
    // assert_eq!(vote_result.yes_votes, 1);
    // assert_eq!(vote_result.no_votes, 0);
    // assert_eq!(vote_result.name, "Test Vote");
}

// TODO: test
// - access rules for methods
// - All assertions in methods
// - default resource behaviour states
// - configured resource behaviours
