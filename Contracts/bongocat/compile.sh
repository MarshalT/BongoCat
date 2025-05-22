#!/bin/bash

# 彩色输出函数
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # 无颜色

echo -e "${YELLOW}开始编译BongoCat智能合约...${NC}"

# 获取当前目录的绝对路径
CONTRACT_DIR=$(cd "$(dirname "$0")"; pwd)

# 检查bongocat.cpp是否存在
if [ ! -f "$CONTRACT_DIR/bongocat.cpp" ]; then
    echo -e "${RED}错误: 在 $CONTRACT_DIR 目录下找不到 bongocat.cpp${NC}"
    exit 1
fi

echo -e "${GREEN}使用Docker编译合约...${NC}"
echo -e "${YELLOW}合约目录: $CONTRACT_DIR${NC}"

# 执行Docker编译命令
docker run --rm --platform linux/amd64 -v "$CONTRACT_DIR":/project -it eosio/eosio.cdt:develop-boxed \
    eosio-cpp -o /project/bongocat.wasm /project/bongocat.cpp --abigen

# 检查编译是否成功
if [ $? -eq 0 ]; then
    echo -e "${GREEN}编译成功!${NC}"
    echo -e "${GREEN}生成文件:${NC}"
    ls -lh "$CONTRACT_DIR"/bongocat.wasm "$CONTRACT_DIR"/bongocat.abi
else
    echo -e "${RED}编译失败，请检查错误信息${NC}"
    exit 1
fi

echo -e "${GREEN}完成！现在您可以部署合约了${NC}" 