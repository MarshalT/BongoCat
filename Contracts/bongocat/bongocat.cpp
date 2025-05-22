#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>
#include <eosio/singleton.hpp>
#include <eosio/crypto.hpp>
#include <eosio/transaction.hpp>
#include <eosio/dispatcher.hpp>
#include <string>

using namespace eosio;
using namespace std;

namespace eosio {
namespace token {
    struct transfer_args {
        name from;
        name to; 
        asset quantity;
        string memo;
    };
}
}

class [[eosio::contract("bongocat")]] bongocat : public contract {
private:
    // 猫咪表
    struct [[eosio::table]] cat {
        uint64_t id;              // 唯一标识符
        name owner;               // 所有者账户
        uint64_t genes;           // 基因编码，决定外观和特性
        uint32_t birth_time;      // 出生时间
        uint32_t cooldown_end;    // 繁殖冷却期结束时间
        uint32_t generation;      // 代数
        uint32_t cooldown_index;  // 决定繁殖冷却期长度
        uint64_t parent1_id;      // 父猫ID
        uint64_t parent2_id;      // 母猫ID
        
        // 猫咪属性
        uint32_t stamina;        // 耐力
        uint32_t agility;        // 敏捷 
        uint32_t cuteness;       // 可爱度
        uint32_t level;          // 等级
        
        uint64_t primary_key() const { return id; }
        uint64_t get_owner() const { return owner.value; }
        uint64_t get_genes() const { return genes; }
        uint64_t get_level() const { return level; }
        uint64_t get_birth_time() const { return birth_time; }
        uint64_t get_generation() const { return generation; }
        bool is_ready_to_breed() const { return cooldown_end <= current_time_point().sec_since_epoch(); }
    };

    typedef multi_index<"cats"_n, cat,
        indexed_by<"byowner"_n, const_mem_fun<cat, uint64_t, &cat::get_owner>>,
        indexed_by<"bygenes"_n, const_mem_fun<cat, uint64_t, &cat::get_genes>>,
        indexed_by<"bylevel"_n, const_mem_fun<cat, uint64_t, &cat::get_level>>,
        indexed_by<"bybirthtime"_n, const_mem_fun<cat, uint64_t, &cat::get_birth_time>>,
        indexed_by<"bygeneration"_n, const_mem_fun<cat, uint64_t, &cat::get_generation>>
    > cat_table;

    // 售卖表
    struct [[eosio::table]] sale {
        uint64_t id;              // 售卖记录ID
        uint64_t cat_id;          // 出售猫咪ID
        name seller;              // 卖家账户
        asset price;              // 价格
        time_point_sec created;   // 创建时间
        
        uint64_t primary_key() const { return id; }
        uint64_t get_cat_id() const { return cat_id; }
        uint64_t get_seller() const { return seller.value; }
        uint64_t get_price() const { return price.amount; }
    };

    typedef multi_index<"sales"_n, sale,
        indexed_by<"bycatid"_n, const_mem_fun<sale, uint64_t, &sale::get_cat_id>>,
        indexed_by<"byseller"_n, const_mem_fun<sale, uint64_t, &sale::get_seller>>,
        indexed_by<"byprice"_n, const_mem_fun<sale, uint64_t, &sale::get_price>>
    > sale_table;

    // 已铸造账户表
    struct [[eosio::table]] minted_accounts {
        name account;             // 已铸造猫咪的账户
        time_point_sec mint_time; // 铸造时间
        
        uint64_t primary_key() const { return account.value; }
    };

    typedef multi_index<"minters"_n, minted_accounts> minters_table;

    // 铸造配置表
    struct [[eosio::table]] mint_config {
        uint64_t id;                // 配置ID (通常为1)
        uint64_t total_supply;      // 总供应量
        uint64_t minted_count;      // 已铸造数量
        asset base_price;           // 基础价格
        uint16_t price_tier;        // 价格层级
        
        uint64_t primary_key() const { return id; }
    };

    typedef multi_index<"mintconfig"_n, mint_config> config_table;

    // 拍卖表
    struct [[eosio::table]] auction {
        uint64_t id;                // 拍卖ID
        uint64_t cat_id;            // 拍卖猫咪ID
        name seller;                // 卖家账户
        asset start_price;          // 起拍价格
        asset current_bid;          // 当前最高出价
        name highest_bidder;        // 当前最高出价者
        time_point_sec start_time;  // 开始时间
        time_point_sec end_time;    // 结束时间
        
        uint64_t primary_key() const { return id; }
        uint64_t get_cat_id() const { return cat_id; }
        uint64_t get_seller() const { return seller.value; }
        uint64_t get_end_time() const { return end_time.sec_since_epoch(); }
    };

    typedef multi_index<"auctions"_n, auction,
        indexed_by<"bycatid"_n, const_mem_fun<auction, uint64_t, &auction::get_cat_id>>,
        indexed_by<"byseller"_n, const_mem_fun<auction, uint64_t, &auction::get_seller>>,
        indexed_by<"byendtime"_n, const_mem_fun<auction, uint64_t, &auction::get_end_time>>
    > auction_table;

    // 道具表
    struct [[eosio::table]] item {
        uint64_t id;                // 道具ID
        name type;                  // 道具类型
        string name;                // 道具名称
        string description;         // 道具描述
        asset price;                // 道具价格
        
        uint64_t primary_key() const { return id; }
        uint64_t get_type() const { return type.value; }
    };

    typedef multi_index<"items"_n, item,
        indexed_by<"bytype"_n, const_mem_fun<item, uint64_t, &item::get_type>>
    > item_table;

    // 猫咪互动记录表
    struct [[eosio::table]] interaction {
        uint64_t id;                // 互动记录ID
        uint64_t cat_id;            // 猫咪ID
        name owner;                 // 互动发起者
        name action_type;           // 互动类型(feed/train/etc)
        uint32_t attribute_change;  // 属性变化值
        time_point_sec timestamp;   // 时间戳
        
        uint64_t primary_key() const { return id; }
        uint64_t get_cat_id() const { return cat_id; }
        uint64_t get_owner() const { return owner.value; }
    };

    typedef multi_index<"interactions"_n, interaction,
        indexed_by<"bycatid"_n, const_mem_fun<interaction, uint64_t, &interaction::get_cat_id>>,
        indexed_by<"byowner"_n, const_mem_fun<interaction, uint64_t, &interaction::get_owner>>
    > interaction_table;

    // 用户道具表
    struct [[eosio::table]] user_item {
        uint64_t id;                // 唯一ID
        uint64_t item_id;           // 道具ID
        name owner;                 // 所有者
        uint32_t quantity;          // 数量
        
        uint64_t primary_key() const { return id; }
        uint64_t get_item_id() const { return item_id; }
        uint64_t get_owner() const { return owner.value; }
    };

    typedef multi_index<"useritems"_n, user_item,
        indexed_by<"byitemid"_n, const_mem_fun<user_item, uint64_t, &user_item::get_item_id>>,
        indexed_by<"byowner"_n, const_mem_fun<user_item, uint64_t, &user_item::get_owner>>
    > user_item_table;

    // 辅助函数
    uint64_t get_next_cat_id() {
        auto cats = cat_table(get_self(), get_self().value);
        return cats.available_primary_key() == 0 ? 1 : cats.available_primary_key();
    }

    uint64_t get_next_sale_id() {
        auto sales = sale_table(get_self(), get_self().value);
        return sales.available_primary_key() == 0 ? 1 : sales.available_primary_key();
    }

    uint64_t get_next_auction_id() {
        auto auctions = auction_table(get_self(), get_self().value);
        return auctions.available_primary_key() == 0 ? 1 : auctions.available_primary_key();
    }

    uint64_t get_next_interaction_id() {
        auto interactions = interaction_table(get_self(), get_self().value);
        return interactions.available_primary_key() == 0 ? 1 : interactions.available_primary_key();
    }

    uint64_t get_next_user_item_id() {
        auto user_items = user_item_table(get_self(), get_self().value);
        return user_items.available_primary_key() == 0 ? 1 : user_items.available_primary_key();
    }

    // 检查账户是否已经铸造过猫咪
    bool has_minted(const name& account) {
        auto minters = minters_table(get_self(), get_self().value);
        return minters.find(account.value) != minters.end();
    }

    // 检查猫咪所有权
    void check_cat_owner(uint64_t cat_id, name owner) {
        auto cats = cat_table(get_self(), get_self().value);
        auto cat_itr = cats.find(cat_id);
        check(cat_itr != cats.end(), "Cat does not exist");
        check(cat_itr->owner == owner, "Not the owner of the cat");
    }

    // 随机数生成，使用区块哈希、交易ID和时间戳组合
    uint64_t random_seed() {
        auto size = transaction_size();
        char* buffer = (char*)(512);
        read_transaction(buffer, size);
        auto hash = sha256(buffer, size);
        
        uint64_t seed = 0;
        for (int i = 0; i < 8; i++) {
            seed <<= 8;
            seed |= (uint64_t)(hash.data()[i]);
        }
        
        // 混合当前时间
        seed ^= current_time_point().sec_since_epoch();
        return seed;
    }

    // 生成猫咪基因
    uint64_t generate_genes() {
        uint64_t seed = random_seed();
        return seed;
    }

    // 计算两只猫的繁殖后代基因
    uint64_t mix_genes(uint64_t genes1, uint64_t genes2) {
        uint64_t seed = random_seed();
        uint64_t new_genes = 0;
        
        // 按位段混合基因
        for(int i=0; i<64; i+=8) {
            if(seed & 1) {
                // 从第一只猫取基因
                new_genes |= ((genes1 >> i) & 0xFF) << i;
            } else {
                // 从第二只猫取基因
                new_genes |= ((genes2 >> i) & 0xFF) << i;
            }
            seed >>= 1;
        }
        
        // 添加一些随机变异
        new_genes ^= (seed & 0xF) << (seed % 60);
        
        return new_genes;
    }

    // 计算冷却时间（单位：秒）
    uint32_t calculate_cooldown(uint32_t cooldown_index) {
        uint32_t cooldown_time;
        
        if(cooldown_index == 0) {
            cooldown_time = 3600; // 1小时
        } else if(cooldown_index == 1) {
            cooldown_time = 7200; // 2小时
        } else if(cooldown_index == 2) {
            cooldown_time = 14400; // 4小时
        } else {
            // 指数增长但不超过7天
            uint32_t calculated_time = 3600u * (uint32_t)(1 << cooldown_index);
            cooldown_time = calculated_time > 604800u ? 604800u : calculated_time;
        }
        
        return cooldown_time;
    }

    // 初始化配置
    void initialize_config() {
        config_table configs(get_self(), get_self().value);
        auto config_itr = configs.find(1);
        
        if(config_itr == configs.end()) {
            configs.emplace(get_self(), [&](auto& c) {
                c.id = 1;
                c.total_supply = 10000;
                c.minted_count = 0;
                c.base_price = asset(10000000, symbol("DFS", 8)); // 0.10000000 DFS
                c.price_tier = 0;
            });
        }
    }

public:
    using contract::contract;

    struct breed_args {
        uint64_t parent1_id;
        uint64_t parent2_id;
    };

    struct createsale_args {
        uint64_t cat_id;
        asset price;
    };

    struct cancelsale_args {
        uint64_t sale_id;
    };

    struct buysale_args {
        uint64_t sale_id;
    };

    struct createauct_args {
        uint64_t cat_id;
        asset start_price;
        uint32_t duration;
    };

    struct placebid_args {
        uint64_t auction_id;
        asset bid_amount;
    };

    struct endauct_args {
        uint64_t auction_id;
    };

    struct feed_args {
        uint64_t cat_id;
    };

    struct train_args {
        uint64_t cat_id;
        uint32_t attribute_type;
    };

    struct upgrade_args {
        uint64_t cat_id;
    };

    struct buyitem_args {
        uint64_t item_id;
        uint32_t quantity;
    };

    struct useitem_args {
        uint64_t cat_id;
        uint64_t item_id;
    };

    struct transfer_args {
        name from;
        name to;
        uint64_t cat_id;
        string memo;
    };

    bongocat(name receiver, name code, datastream<const char*> ds)
        : contract(receiver, code, ds) {
        // 确保合约初始配置存在
        initialize_config();
    }

    [[eosio::on_notify("eosio.token::transfer")]]
    void on_transfer(name from, name to, asset quantity, string memo) {
        // 确保不是我们自己发送的通知
        if (from == get_self() || to != get_self()) {
            return;
        }

        // 解析备注获取操作类型
        if (memo == "mint") {
            // 铸造操作处理
            check(quantity.symbol == symbol("DFS", 8), "Only DFS token accepted for minting");
            
            config_table configs(get_self(), get_self().value);
            auto config_itr = configs.find(1);
            check(config_itr != configs.end(), "Contract not configured properly");
            
            // 检查当前铸造价格
            check(quantity >= config_itr->base_price, "Insufficient DFS sent for minting");
            
            // 记录用户已经支付，实际铸造操作会在mint action中完成
            // 这里可以记录预付状态，但为简化，我们在mint操作中检查用户是否已铸造
        }
        else if (memo.substr(0, 6) == "breed:") {
            // 繁殖操作处理
            check(quantity.symbol == symbol("DFS", 8), "Only DFS token accepted for breeding");
            check(quantity.amount >= 50000, "Breeding requires 5.0000 DFS");
            
            // 记录用户已经支付，实际繁殖操作会在breed action中完成
        }
        else if (memo.substr(0, 4) == "bid:") {
            // 竞拍出价操作处理
            check(quantity.symbol == symbol("DFS", 8), "Only DFS token accepted for bidding");
            
            // 从备注中提取拍卖ID
            string auction_id_str = memo.substr(4);
            uint64_t auction_id = stoull(auction_id_str);
            
            auction_table auctions(get_self(), get_self().value);
            auto auction_itr = auctions.find(auction_id);
            check(auction_itr != auctions.end(), "Auction does not exist");
            check(auction_itr->end_time > time_point_sec(current_time_point()), "Auction has ended");
            check(quantity > auction_itr->current_bid, "Bid must be higher than current bid");
            
            // 如果有之前的出价者，退还其资金
            if (auction_itr->highest_bidder != name(0)) {
                action(
                    permission_level{get_self(), "active"_n},
                    "eosio.token"_n,
                    "transfer"_n,
                    std::make_tuple(get_self(), auction_itr->highest_bidder, auction_itr->current_bid, "Refund of outbid")
                ).send();
            }
            
            // 更新最高出价信息
            auctions.modify(auction_itr, same_payer, [&](auto& a) {
                a.current_bid = quantity;
                a.highest_bidder = from;
            });
        }
        else if (memo.substr(0, 8) == "upgrade:") {
            // 升级操作处理
            check(quantity.symbol == symbol("BCAT", 8), "Only BCAT token accepted for upgrading");
            
            // 从备注中提取猫咪ID
            string cat_id_str = memo.substr(8);
            uint64_t cat_id = stoull(cat_id_str);
            
            // 检查猫咪存在并且调用者是所有者
            check_cat_owner(cat_id, from);
            
            // 升级逻辑会在upgrade action中实现
        }
    }

    // 铸造猫咪
    [[eosio::action]]
    void mint() {
        // 获取调用者
        name owner = get_self();
        require_auth(owner);
        
        // 确保用户没有铸造过猫咪
        check(!has_minted(owner), "Account already minted a cat");
        
        // 获取配置信息
        config_table configs(get_self(), get_self().value);
        auto config_itr = configs.find(1);
        check(config_itr != configs.end(), "Contract not configured properly");
        
        // 确保未超过总供应量
        check(config_itr->minted_count < config_itr->total_supply, "All cats have been minted");
        
        // 生成基因
        uint64_t genes = generate_genes();
        
        // 创建新猫咪
        cat_table cats(get_self(), get_self().value);
        cats.emplace(owner, [&](auto& c) {
            c.id = get_next_cat_id();
            c.owner = owner;
            c.genes = genes;
            c.birth_time = current_time_point().sec_since_epoch();
            c.cooldown_end = 0; // 初代猫咪没有冷却期
            c.generation = 0;   // 初代猫咪为0代
            c.cooldown_index = 0;
            c.parent1_id = 0;   // 初代猫咪没有父母
            c.parent2_id = 0;
            c.stamina = uint16_t(random_seed() % 100) + 1;  // 1-100随机值
            c.agility = uint16_t(random_seed() % 100) + 1;
            c.cuteness = uint16_t(random_seed() % 100) + 1;
            c.level = 1;        // 初始等级为1
        });
        
        // 记录用户已铸造
        minters_table minters(get_self(), get_self().value);
        minters.emplace(owner, [&](auto& m) {
            m.account = owner;
            m.mint_time = current_time_point();
        });
        
        // 更新计数和价格等级
        configs.modify(config_itr, same_payer, [&](auto& c) {
            c.minted_count++;
            // 每铸造1000只猫咪，价格上涨10%
            if (c.minted_count % 1000 == 0) {
                c.price_tier++;
                c.base_price.amount = c.base_price.amount * 11 / 10; // 增加10%
            }
        });
    }

    // 转移猫咪所有权
    [[eosio::action]]
    void transfer(name from, name to, uint64_t cat_id, string memo) {
        require_auth(from);
        
        // 检查接收方是否有效
        check(is_account(to), "To account does not exist");
        check(from != to, "Cannot transfer to self");
        
        // 检查猫咪所有权
        check_cat_owner(cat_id, from);
        
        // 确保猫咪没有在售卖或拍卖中
        sale_table sales(get_self(), get_self().value);
        auto sale_by_cat_id = sales.get_index<"bycatid"_n>();
        check(sale_by_cat_id.find(cat_id) == sale_by_cat_id.end(), "Cat is currently for sale");
        
        auction_table auctions(get_self(), get_self().value);
        auto auction_by_cat_id = auctions.get_index<"bycatid"_n>();
        check(auction_by_cat_id.find(cat_id) == auction_by_cat_id.end(), "Cat is currently being auctioned");
        
        // 执行转移
        cat_table cats(get_self(), get_self().value);
        auto cat_itr = cats.find(cat_id);
        cats.modify(cat_itr, from, [&](auto& c) {
            c.owner = to;
        });
    }

    // 繁殖猫咪
    [[eosio::action]]
    void breed(uint64_t parent1_id, uint64_t parent2_id) {
        name owner = get_self();
        require_auth(owner);
        
        // 检查两只猫咪是否存在且属于同一个所有者
        cat_table cats(get_self(), get_self().value);
        auto parent1_itr = cats.find(parent1_id);
        auto parent2_itr = cats.find(parent2_id);
        
        check(parent1_itr != cats.end(), "Parent 1 does not exist");
        check(parent2_itr != cats.end(), "Parent 2 does not exist");
        check(parent1_itr->owner == owner, "Not the owner of parent 1");
        check(parent2_itr->owner == owner, "Not the owner of parent 2");
        check(parent1_id != parent2_id, "Cannot breed a cat with itself");
        
        // 检查两只猫咪是否都不在冷却期
        check(parent1_itr->is_ready_to_breed(), "Parent 1 is still in cooldown");
        check(parent2_itr->is_ready_to_breed(), "Parent 2 is still in cooldown");
        
        // 混合基因生成新猫咪的基因
        uint64_t new_genes = mix_genes(parent1_itr->genes, parent2_itr->genes);
        
        // 计算新猫咪的代数 (父母中较高的代数 + 1)
        uint32_t new_generation = (parent1_itr->generation > parent2_itr->generation ? parent1_itr->generation : parent2_itr->generation) + 1;
        
        // 创建新猫咪
        cats.emplace(owner, [&](auto& c) {
            c.id = get_next_cat_id();
            c.owner = owner;
            c.genes = new_genes;
            c.birth_time = current_time_point().sec_since_epoch();
            c.cooldown_end = 0; // 新生猫咪没有冷却期
            c.generation = new_generation;
            c.cooldown_index = 0;
            c.parent1_id = parent1_id;
            c.parent2_id = parent2_id;
            
            // 基于父母属性计算子代初始属性
            c.stamina = (parent1_itr->stamina + parent2_itr->stamina) / 2 + uint32_t(random_seed() % 10) - 5;
            c.agility = (parent1_itr->agility + parent2_itr->agility) / 2 + uint32_t(random_seed() % 10) - 5;
            c.cuteness = (parent1_itr->cuteness + parent2_itr->cuteness) / 2 + uint32_t(random_seed() % 10) - 5;
            
            // 确保属性在有效范围内
            c.stamina = c.stamina < 1 ? 1 : (c.stamina > 100 ? 100 : c.stamina);
            c.agility = c.agility < 1 ? 1 : (c.agility > 100 ? 100 : c.agility);
            c.cuteness = c.cuteness < 1 ? 1 : (c.cuteness > 100 ? 100 : c.cuteness);
            c.level = 1;        // 初始等级为1
        });
        
        // 更新父母猫咪的冷却期和冷却指数
        cats.modify(parent1_itr, same_payer, [&](auto& c) {
            c.cooldown_index = c.cooldown_index + 1 > 6 ? 6 : c.cooldown_index + 1;
            c.cooldown_end = current_time_point().sec_since_epoch() + calculate_cooldown(c.cooldown_index);
        });
        
        cats.modify(parent2_itr, same_payer, [&](auto& c) {
            c.cooldown_index = c.cooldown_index + 1 > 6 ? 6 : c.cooldown_index + 1;
            c.cooldown_end = current_time_point().sec_since_epoch() + calculate_cooldown(c.cooldown_index);
        });
    }

    // 创建售卖
    [[eosio::action]]
    void createsale(uint64_t cat_id, asset price) {
        name owner = get_self();
        require_auth(owner);
        
        // 价格检查
        check(price.amount > 0, "Price must be positive");
        check(price.symbol == symbol("DFS", 8), "Only DFS is accepted for cat sales");
        
        // 检查猫咪所有权
        check_cat_owner(cat_id, owner);
        
        // 确保猫咪没有在售卖或拍卖中
        sale_table sales(get_self(), get_self().value);
        auto sale_by_cat_id = sales.get_index<"bycatid"_n>();
        check(sale_by_cat_id.find(cat_id) == sale_by_cat_id.end(), "Cat is already for sale");
        
        auction_table auctions(get_self(), get_self().value);
        auto auction_by_cat_id = auctions.get_index<"bycatid"_n>();
        check(auction_by_cat_id.find(cat_id) == auction_by_cat_id.end(), "Cat is currently being auctioned");
        
        // 创建售卖记录
        sales.emplace(owner, [&](auto& s) {
            s.id = get_next_sale_id();
            s.cat_id = cat_id;
            s.seller = owner;
            s.price = price;
            s.created = current_time_point();
        });
    }

    // 取消售卖
    [[eosio::action]]
    void cancelsale(uint64_t sale_id) {
        name owner = get_self();
        require_auth(owner);
        
        // 查找售卖记录
        sale_table sales(get_self(), get_self().value);
        auto sale_itr = sales.find(sale_id);
        check(sale_itr != sales.end(), "Sale does not exist");
        check(sale_itr->seller == owner, "Not the seller of this cat");
        
        // 删除售卖记录
        sales.erase(sale_itr);
    }

    // 购买猫咪
    [[eosio::action]]
    void buysale(uint64_t sale_id) {
        name buyer = get_self();
        require_auth(buyer);
        
        // 查找售卖记录
        sale_table sales(get_self(), get_self().value);
        auto sale_itr = sales.find(sale_id);
        check(sale_itr != sales.end(), "Sale does not exist");
        check(sale_itr->seller != buyer, "Cannot buy your own cat");
        
        // 获取猫咪信息
        cat_table cats(get_self(), get_self().value);
        auto cat_itr = cats.find(sale_itr->cat_id);
        check(cat_itr != cats.end(), "Cat does not exist");
        check(cat_itr->owner == sale_itr->seller, "Seller no longer owns this cat");
        
        // 转移猫咪所有权
        cats.modify(cat_itr, same_payer, [&](auto& c) {
            c.owner = buyer;
        });
        
        // 将资金发送给卖家
        action(
            permission_level{get_self(), "active"_n},
            "eosio.token"_n,
            "transfer"_n,
            std::make_tuple(get_self(), sale_itr->seller, sale_itr->price, "Payment for cat #" + to_string(sale_itr->cat_id))
        ).send();
        
        // 删除售卖记录
        sales.erase(sale_itr);
    }

    // 创建拍卖
    [[eosio::action]]
    void createauct(uint64_t cat_id, asset start_price, uint32_t duration) {
        name owner = get_self();
        require_auth(owner);
        
        // 价格和时间检查
        check(start_price.amount > 0, "Start price must be positive");
        check(start_price.symbol == symbol("DFS", 8), "Only DFS is accepted for auctions");
        check(duration >= 3600 && duration <= 604800, "Duration must be between 1 hour and 7 days");
        
        // 检查猫咪所有权
        check_cat_owner(cat_id, owner);
        
        // 确保猫咪没有在售卖或拍卖中
        sale_table sales(get_self(), get_self().value);
        auto sale_by_cat_id = sales.get_index<"bycatid"_n>();
        check(sale_by_cat_id.find(cat_id) == sale_by_cat_id.end(), "Cat is already for sale");
        
        auction_table auctions(get_self(), get_self().value);
        auto auction_by_cat_id = auctions.get_index<"bycatid"_n>();
        check(auction_by_cat_id.find(cat_id) == auction_by_cat_id.end(), "Cat is already being auctioned");
        
        // 创建拍卖记录
        auctions.emplace(owner, [&](auto& a) {
            a.id = get_next_auction_id();
            a.cat_id = cat_id;
            a.seller = owner;
            a.start_price = start_price;
            a.current_bid = asset(0, symbol("DFS", 8));
            a.highest_bidder = name(0);
            a.start_time = current_time_point();
            a.end_time = time_point_sec(current_time_point().sec_since_epoch() + duration);
        });
    }

    // 参与拍卖出价
    [[eosio::action]]
    void placebid(uint64_t auction_id, asset bid_amount) {
        // 此操作主要通过转账通知处理，此处只是为了完整性而提供
        // 实际的竞拍逻辑在on_transfer中实现
        name bidder = get_self();
        require_auth(bidder);
        
        auction_table auctions(get_self(), get_self().value);
        auto auction_itr = auctions.find(auction_id);
        check(auction_itr != auctions.end(), "Auction does not exist");
        check(auction_itr->seller != bidder, "Cannot bid on your own auction");
        check(auction_itr->end_time > time_point_sec(current_time_point()), "Auction has ended");
        check(bid_amount > auction_itr->current_bid, "Bid must be higher than current bid");
        check(bid_amount.symbol == symbol("DFS", 8), "Only DFS token accepted for bidding");
    }

    // 结束拍卖
    [[eosio::action]]
    void endauct(uint64_t auction_id) {
        // 任何人都可以结束已经到期的拍卖
        name caller = get_self();
        require_auth(caller);
        
        auction_table auctions(get_self(), get_self().value);
        auto auction_itr = auctions.find(auction_id);
        check(auction_itr != auctions.end(), "Auction does not exist");
        check(auction_itr->end_time <= time_point_sec(current_time_point()), "Auction has not ended yet");
        
        // 获取猫咪信息
        cat_table cats(get_self(), get_self().value);
        auto cat_itr = cats.find(auction_itr->cat_id);
        check(cat_itr != cats.end(), "Cat does not exist");
        
        // 如果有出价，转移猫咪所有权给最高出价者，并向卖家发送资金
        if (auction_itr->highest_bidder != name(0)) {
            // 确认卖家还是所有者
            check(cat_itr->owner == auction_itr->seller, "Seller no longer owns this cat");
            
            // 转移猫咪所有权
            cats.modify(cat_itr, same_payer, [&](auto& c) {
                c.owner = auction_itr->highest_bidder;
            });
            
            // 将资金发送给卖家
            if (auction_itr->current_bid.amount > 0) {
                action(
                    permission_level{get_self(), "active"_n},
                    "eosio.token"_n,
                    "transfer"_n,
                    std::make_tuple(get_self(), auction_itr->seller, auction_itr->current_bid, "Payment for auctioned cat #" + to_string(auction_itr->cat_id))
                ).send();
            }
        }
        
        // 删除拍卖记录
        auctions.erase(auction_itr);
    }

    // 喂食猫咪
    [[eosio::action]]
    void feed(uint64_t cat_id) {
        name owner = get_self();
        require_auth(owner);
        
        // 检查猫咪所有权
        check_cat_owner(cat_id, owner);
        
        cat_table cats(get_self(), get_self().value);
        auto cat_itr = cats.find(cat_id);
        
        // 提升猫咪的耐力属性
        cats.modify(cat_itr, same_payer, [&](auto& c) {
            // 喂食提高耐力，但不超过100
            uint32_t new_stamina = c.stamina + 1 + (random_seed() % 3);
            c.stamina = new_stamina > 100 ? 100 : new_stamina;
        });
        
        // 记录互动
        interaction_table interactions(get_self(), get_self().value);
        interactions.emplace(owner, [&](auto& i) {
            i.id = get_next_interaction_id();
            i.cat_id = cat_id;
            i.owner = owner;
            i.action_type = "feed"_n;
            i.attribute_change = 1;
            i.timestamp = current_time_point();
        });
    }

    // 训练猫咪
    [[eosio::action]]
    void train(uint64_t cat_id, uint32_t attribute_type) {
        name owner = get_self();
        require_auth(owner);
        
        // 检查猫咪所有权
        check_cat_owner(cat_id, owner);
        
        // 检查属性类型有效性
        check(attribute_type >= 1 && attribute_type <= 3, "Invalid attribute type (1=stamina, 2=agility, 3=cuteness)");
        
        cat_table cats(get_self(), get_self().value);
        auto cat_itr = cats.find(cat_id);
        
        // 根据选择的属性类型进行训练
        cats.modify(cat_itr, same_payer, [&](auto& c) {
            uint32_t improvement = 1 + (random_seed() % 2);
            
            if (attribute_type == 1) {
                uint32_t new_stamina = c.stamina + improvement;
                c.stamina = new_stamina > 100 ? 100 : new_stamina;
            } else if (attribute_type == 2) {
                uint32_t new_agility = c.agility + improvement;
                c.agility = new_agility > 100 ? 100 : new_agility;
            } else if (attribute_type == 3) {
                uint32_t new_cuteness = c.cuteness + improvement;
                c.cuteness = new_cuteness > 100 ? 100 : new_cuteness;
            }
        });
        
        // 记录互动
        interaction_table interactions(get_self(), get_self().value);
        interactions.emplace(owner, [&](auto& i) {
            i.id = get_next_interaction_id();
            i.cat_id = cat_id;
            i.owner = owner;
            i.action_type = "train"_n;
            i.attribute_change = attribute_type;
            i.timestamp = current_time_point();
        });
    }

    // 升级猫咪
    [[eosio::action]]
    void upgrade(uint64_t cat_id) {
        name owner = get_self();
        require_auth(owner);
        
        // 检查猫咪所有权
        check_cat_owner(cat_id, owner);
        
        cat_table cats(get_self(), get_self().value);
        auto cat_itr = cats.find(cat_id);
        
        // 检查猫咪等级是否已达到最大值
        check(cat_itr->level < 100, "Cat has already reached maximum level (100)");
        
        // 执行升级
        cats.modify(cat_itr, same_payer, [&](auto& c) {
            c.level++;
            
            // 等级提升也会稍微提高其他属性
            uint32_t new_stamina = c.stamina + (random_seed() % 2);
            c.stamina = new_stamina > 100 ? 100 : new_stamina;
            
            uint32_t new_agility = c.agility + (random_seed() % 2);
            c.agility = new_agility > 100 ? 100 : new_agility;
            
            uint32_t new_cuteness = c.cuteness + (random_seed() % 2);
            c.cuteness = new_cuteness > 100 ? 100 : new_cuteness;
        });
        
        // 记录互动
        interaction_table interactions(get_self(), get_self().value);
        interactions.emplace(owner, [&](auto& i) {
            i.id = get_next_interaction_id();
            i.cat_id = cat_id;
            i.owner = owner;
            i.action_type = "upgrade"_n;
            i.attribute_change = 0;
            i.timestamp = current_time_point();
        });
    }

    // 购买道具
    [[eosio::action]]
    void buyitem(uint64_t item_id, uint32_t quantity) {
        name buyer = get_self();
        require_auth(buyer);
        
        check(quantity > 0, "Quantity must be positive");
        
        // 获取道具信息
        item_table items(get_self(), get_self().value);
        auto item_itr = items.find(item_id);
        check(item_itr != items.end(), "Item does not exist");
        
        // 计算总价格
        asset total_price = item_itr->price;
        total_price.amount *= quantity;
        
        // 购买道具逻辑
        user_item_table user_items(get_self(), get_self().value);
        
        // 查找用户是否已有该道具
        auto user_items_by_owner_and_item = user_items.get_index<"byowner"_n>();
        bool found = false;
        
        for (auto it = user_items_by_owner_and_item.lower_bound(buyer.value);
             it != user_items_by_owner_and_item.end() && it->owner == buyer; ++it) {
            if (it->item_id == item_id) {
                user_items.modify(user_items.find(it->id), same_payer, [&](auto& ui) {
                    ui.quantity += quantity;
                });
                found = true;
                break;
            }
        }
        
        if (!found) {
            user_items.emplace(buyer, [&](auto& ui) {
                ui.id = get_next_user_item_id();
                ui.item_id = item_id;
                ui.owner = buyer;
                ui.quantity = quantity;
            });
        }
        
        // 假设支付已通过转账完成
    }

    // 使用道具
    [[eosio::action]]
    void useitem(uint64_t cat_id, uint64_t item_id) {
        name owner = get_self();
        require_auth(owner);
        
        // 检查猫咪所有权
        check_cat_owner(cat_id, owner);
        
        // 检查道具存在
        item_table items(get_self(), get_self().value);
        auto item_itr = items.find(item_id);
        check(item_itr != items.end(), "Item does not exist");
        
        // 检查用户是否有该道具
        user_item_table user_items(get_self(), get_self().value);
        auto user_items_by_owner_and_item = user_items.get_index<"byowner"_n>();
        bool found = false;
        uint64_t user_item_id = 0;
        
        for (auto it = user_items_by_owner_and_item.lower_bound(owner.value);
             it != user_items_by_owner_and_item.end() && it->owner == owner; ++it) {
            if (it->item_id == item_id && it->quantity > 0) {
                user_item_id = it->id;
                found = true;
                break;
            }
        }
        
        check(found, "You don't have this item or quantity is zero");
        
        // 应用道具效果
        cat_table cats(get_self(), get_self().value);
        auto cat_itr = cats.find(cat_id);
        
        // 根据道具类型应用不同效果
        string item_name = item_itr->name;
        name item_type = item_itr->type;
        
        cats.modify(cat_itr, same_payer, [&](auto& c) {
            if (item_type == "stamina"_n) {
                uint32_t new_stamina = c.stamina + 5;
                c.stamina = new_stamina > 100 ? 100 : new_stamina;
            } else if (item_type == "agility"_n) {
                uint32_t new_agility = c.agility + 5;
                c.agility = new_agility > 100 ? 100 : new_agility;
            } else if (item_type == "cuteness"_n) {
                uint32_t new_cuteness = c.cuteness + 5;
                c.cuteness = new_cuteness > 100 ? 100 : new_cuteness;
            } else if (item_type == "allstats"_n) {
                uint32_t new_stamina = c.stamina + 3;
                c.stamina = new_stamina > 100 ? 100 : new_stamina;
                
                uint32_t new_agility = c.agility + 3;
                c.agility = new_agility > 100 ? 100 : new_agility;
                
                uint32_t new_cuteness = c.cuteness + 3;
                c.cuteness = new_cuteness > 100 ? 100 : new_cuteness;
            } else if (item_type == "cooldown"_n) {
                c.cooldown_end = current_time_point().sec_since_epoch(); // 立即结束冷却期
            }
        });
        
        // 减少用户道具数量
        auto user_item_itr = user_items.find(user_item_id);
        if (user_item_itr->quantity > 1) {
            user_items.modify(user_item_itr, same_payer, [&](auto& ui) {
                ui.quantity--;
            });
        } else {
            user_items.erase(user_item_itr);
        }
        
        // 记录互动
        interaction_table interactions(get_self(), get_self().value);
        interactions.emplace(owner, [&](auto& i) {
            i.id = get_next_interaction_id();
            i.cat_id = cat_id;
            i.owner = owner;
            i.action_type = "useitem"_n;
            i.attribute_change = item_id;
            i.timestamp = current_time_point();
        });
    }
};

// 手动实现apply函数替代EOSIO_DISPATCH宏
extern "C" {
   void apply(uint64_t receiver, uint64_t code, uint64_t action) {
      auto self = name(receiver);
      
      if(code == receiver) {
         if(action == "mint"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::mint);
         } else if(action == "transfer"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::transfer);
         } else if(action == "breed"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::breed);
         } else if(action == "createsale"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::createsale);
         } else if(action == "cancelsale"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::cancelsale);
         } else if(action == "buysale"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::buysale);
         } else if(action == "createauct"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::createauct);
         } else if(action == "placebid"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::placebid);
         } else if(action == "endauct"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::endauct);
         } else if(action == "feed"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::feed);
         } else if(action == "train"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::train);
         } else if(action == "upgrade"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::upgrade);
         } else if(action == "buyitem"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::buyitem);
         } else if(action == "useitem"_n.value) {
            execute_action(name(receiver), name(code), &bongocat::useitem);
         }
      } else if(code == "eosio.token"_n.value && action == "transfer"_n.value) {
         execute_action(name(receiver), name(code), &bongocat::on_transfer);
      }
   }
}