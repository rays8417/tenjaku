module higgs::BenStokes {
    use std::string;
    use std::signer;
    use std::vector;
    use std::option;
    use aptos_framework::coin::{Self, BurnCapability, FreezeCapability, MintCapability};

    /// Error codes
    const ENOT_ADMIN: u64 = 1;
    /// Maximum supply exceeded
    const EMAX_SUPPLY_EXCEEDED: u64 = 2;

    /// Maximum supply of tokens (20 million with 8 decimals)
    const MAX_SUPPLY: u64 = 20_000_000 * 100_000_000;

    struct BenStokes {}

    struct CoinCapabilities has key {
        mint_cap: MintCapability<BenStokes>,
        burn_cap: BurnCapability<BenStokes>,
        freeze_cap: FreezeCapability<BenStokes>,
    }

    /// Resource to track all token holders
    struct TokenHolders has key {
        holders: vector<address>,
    }

    /// Initialize the coin
    fun init_module(admin: &signer) {
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<BenStokes>(
            admin,
            string::utf8(b"BenStokes"),
            string::utf8(b"BST"),
            8,
            true, // monitor_supply
        );

        // Register admin for the coin
        coin::register<BenStokes>(admin);
        
        // Mint initial supply to admin (20 million tokens - the maximum supply)
        let initial_supply = MAX_SUPPLY; // 20M tokens with 8 decimals
        let coins = coin::mint<BenStokes>(initial_supply, &mint_cap);
        coin::deposit(signer::address_of(admin), coins);

        // Store capabilities after using mint_cap
        move_to(admin, CoinCapabilities {
            mint_cap,
            burn_cap,
            freeze_cap,
        });

        // Initialize token holders list with admin as first holder
        let holders = vector::empty<address>();
        vector::push_back(&mut holders, signer::address_of(admin));
        move_to(admin, TokenHolders {
            holders,
        });
    }

    /// Mint new coins (only admin) - Note: All 20M tokens are minted at deployment
    public entry fun mint(admin: &signer, to: address, amount: u64) acquires CoinCapabilities, TokenHolders {
        let admin_addr = signer::address_of(admin);
        
        // Check if minting would exceed maximum supply
        let current_supply_option = coin::supply<BenStokes>();
        assert!(option::is_some(&current_supply_option), EMAX_SUPPLY_EXCEEDED);
        let current_supply = *option::borrow(&current_supply_option);
        assert!(current_supply + (amount as u128) <= (MAX_SUPPLY as u128), EMAX_SUPPLY_EXCEEDED);
        
        let caps = borrow_global<CoinCapabilities>(admin_addr);
        let coins = coin::mint<BenStokes>(amount, &caps.mint_cap);
        coin::deposit(to, coins);
        
        // Add recipient to holders list
        add_holder(admin_addr, to);
    }

    /// Helper function to add an address to holders list if not already present
    fun add_holder(admin_addr: address, new_holder: address) acquires TokenHolders {
        let holders_resource = borrow_global_mut<TokenHolders>(admin_addr);
        let holders = &mut holders_resource.holders;
        
        // Check if holder already exists
        let len = vector::length(holders);
        let i = 0;
        let found = false;
        while (i < len) {
            if (*vector::borrow(holders, i) == new_holder) {
                found = true;
                break
            };
            i = i + 1;
        };
        
        // Add holder if not found
        if (!found) {
            vector::push_back(holders, new_holder);
        };
    }

    /// Register for the coin
    public entry fun register(account: &signer) acquires TokenHolders {
        let account_addr = signer::address_of(account);
        coin::register<BenStokes>(account);
        
        // Add to holders list (assuming admin address is the deployer)
        // You may need to adjust this based on how you want to identify the admin
        let admin_addr = @higgs;
        add_holder(admin_addr, account_addr);
    }

    /// Transfer coins
    public entry fun transfer(from: &signer, to: address, amount: u64) acquires TokenHolders {
        coin::transfer<BenStokes>(from, to, amount);
        
        // Add recipient to holders list
        let admin_addr = @higgs;
        add_holder(admin_addr, to);
    }

    #[view]
    /// Get balance
    public fun balance(addr: address): u64 {
        coin::balance<BenStokes>(addr)
    }

    #[view]
    /// Get coin info
    public fun get_coin_info(): (string::String, string::String, u8) {
        (
            coin::name<BenStokes>(),
            coin::symbol<BenStokes>(),
            coin::decimals<BenStokes>()
        )
    }

    #[view]
    /// Get list of all token holders
    public fun get_token_holders(): vector<address> acquires TokenHolders {
        let admin_addr = @higgs;
        let holders_resource = borrow_global<TokenHolders>(admin_addr);
        holders_resource.holders
    }

    #[view]
    /// Get number of token holders
    public fun get_holder_count(): u64 acquires TokenHolders {
        let admin_addr = @higgs;
        let holders_resource = borrow_global<TokenHolders>(admin_addr);
        vector::length(&holders_resource.holders)
    }

    #[view]
    /// Get current supply and maximum supply
    public fun get_supply_info(): (u128, u64) {
        let current_supply_option = coin::supply<BenStokes>();
        let current_supply = if (option::is_some(&current_supply_option)) {
            *option::borrow(&current_supply_option)
        } else {
            0u128
        };
        (current_supply, MAX_SUPPLY)
    }
}
