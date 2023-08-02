{
  description = "Minimal rust wasm32-unknown-unknown example";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "nixpkgs/nixos-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ 
          # rust-overlay.overlay 
        ];
        pkgs = import nixpkgs { inherit system overlays; };
        # rust = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;
      in
      {
        defaultPackage = pkgs.rustPlatform.buildRustPackage {
          pname = "scrypto-example";
          version = "1.0.0";
          src = ./.;

          cargoLock = {
            lockFile = ./Cargo.lock;
          };
        };

        devShell = pkgs.mkShell rec {
          buildInputs = with pkgs; [
            nixpkgs-fmt
            clang
            cmake
            # Replace llvmPackages with llvmPackages_X, where X is the latest LLVM version (at the time of writing, 16)
            rust-analyzer
            llvmPackages.bintools
            rustup
          ];
          RUSTC_VERSION = pkgs.lib.readFile ./rust-toolchain;
          # https://github.com/rust-lang/rust-bindgen#environment-variables
          LIBCLANG_PATH = pkgs.lib.makeLibraryPath [ pkgs.llvmPackages_latest.libclang.lib ];
          shellHook = ''
            export PATH=$PATH:''${CARGO_HOME:-~/.cargo}/bin
            export PATH=$PATH:''${RUSTUP_HOME:-~/.rustup}/toolchains/$RUSTC_VERSION-x86_64-unknown-linux-gnu/bin/
            '';
          # Add precompiled library to rustc search path
          RUSTFLAGS = (builtins.map (a: ''-L ${a}/lib'') [
            # add libraries here (e.g. pkgs.libvmi)
          ]);
          # Add glibc, clang, glib and other headers to bindgen search path
          BINDGEN_EXTRA_CLANG_ARGS = 
          # Includes with normal include path
          (builtins.map (a: ''-I"${a}/include"'') [
            # add dev libraries here (e.g. pkgs.libvmi.dev)
            pkgs.glibc.dev 
          ])
          # Includes with special directory paths
          ++ [
            ''-I"${pkgs.llvmPackages_latest.libclang.lib}/lib/clang/${pkgs.llvmPackages_latest.libclang.version}/include"''
            ''-I"${pkgs.glib.dev}/include/glib-2.0"''
            ''-I${pkgs.glib.out}/lib/glib-2.0/include/''
          ];
        };
      }
    );
}

# {
#   inputs = {
#     nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
#     flake-parts.url = "github:hercules-ci/flake-parts";
#     systems.url = "github:nix-systems/default";
# 
#     # Rust
#     dream2nix.url = "github:nix-community/dream2nix";
# 
#     # Dev tools
#     treefmt-nix.url = "github:numtide/treefmt-nix";
#     mission-control.url = "github:Platonic-Systems/mission-control";
#     flake-root.url = "github:srid/flake-root";
#   };
# 
#   outputs = inputs:
#     inputs.flake-parts.lib.mkFlake { inherit inputs; } {
#       systems = import inputs.systems;
#       imports = [
#         inputs.dream2nix.flakeModuleBeta
#         inputs.treefmt-nix.flakeModule
#         inputs.mission-control.flakeModule
#         inputs.flake-root.flakeModule
#       ];
#       perSystem = { config, self', pkgs, lib, system, ... }: {
#         # Rust project definition
#         # cf. https://github.com/nix-community/dream2nix
#         dream2nix.inputs."scrypto-example" = {
#           source = lib.sourceFilesBySuffices ./. [
#             ".rs"
#             "Cargo.toml"
#             "Cargo.lock"
#           ];
#           projects."scrypto-example" = { name, ... }: {
#             inherit name;
#             subsystem = "rust";
#             translator = "cargo-lock";
#           };
#         };
# 
#         # Flake outputs
#         packages = config.dream2nix.outputs.scrypto-example.packages;
#         devShells.default = pkgs.mkShell {
#           inputsFrom = [
#             config.dream2nix.outputs.scrypto-example.devShells.default
#             config.treefmt.build.devShell
#             config.mission-control.devShell
#             config.flake-root.devShell
#           ];
#           shellHook = ''
#             # For rust-analyzer 'hover' tooltips to work.
#             export RUST_SRC_PATH=${pkgs.rustPlatform.rustLibSrc}
#           '';
#           nativeBuildInputs = [
#             pkgs.cargo-watch
#             pkgs.rust-analyzer
#           ];
#         };
# 
#         # Add your auto-formatters here.
#         # cf. https://numtide.github.io/treefmt/
#         treefmt.config = {
#           projectRootFile = "flake.nix";
#           programs = {
#             nixpkgs-fmt.enable = true;
#             rustfmt.enable = true;
#           };
#         };
# 
#         # Makefile'esque but in Nix. Add your dev scripts here.
#         # cf. https://github.com/Platonic-Systems/mission-control
#         mission-control.scripts = {
#           fmt = {
#             exec = config.treefmt.build.wrapper;
#             description = "Auto-format project tree";
#           };
# 
#           run = {
#             exec = ''
#               cargo run "$@"
#             '';
#             description = "Run the project executable";
#           };
# 
#           watch = {
#             exec = ''
#               set -x
#               cargo watch -x "run -- $*"
#             '';
#             description = "Watch for changes and run the project executable";
#           };
#         };
#       };
#     };
# }
