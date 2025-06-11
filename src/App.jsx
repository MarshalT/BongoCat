import React, { useState, useEffect } from 'react'
import { Button, message, Layout, Typography, Tabs, Modal, Tag } from 'antd'
import {
  WalletOutlined,
  LogoutOutlined,
  HomeOutlined,
  ShopOutlined,
  TrophyOutlined
} from '@ant-design/icons'
import Wallet from 'dfssdk'
import { WalletType } from 'dfssdk/dist/types'
import CatList from './components/CatList'
import CatDetail from './components/CatDetail'
import RankingList from './components/RankingList'
import { getUserCats, mintCat } from './utils/chainOperations'
import { getAccountBalance } from './utils/eosUtils'
import './App.css'

const { Header, Content } = Layout
const { Title, Text } = Typography

function App() {
  // DFS wallet state
  const [dfsWallet, setDfsWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState(null)

  // Cat functionality state
  const [catList, setCatList] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [refreshCats, setRefreshCats] = useState(0)
  const [activeTab, setActiveTab] = useState('home')
  const [catDetailsVisible, setCatDetailsVisible] = useState(false)
  const [mintingCat, setMintingCat] = useState(false)

    // Initialize DFS wallet
  useEffect(() => {
    // Initialize wallet per README example
    const wallet = new Wallet({
      appName: '猫星球',
      logo: 'https://dfs.land/assets/icons/180x180.png',
      rpcUrl: 'https://api.dfs.land',
    })
    setDfsWallet(wallet)
    console.log('钱包对象已初始化', wallet);
    // 不再自动尝试连接钱包，只在用户点击连接按钮时连接
  }, []);

  // Get account information
  const fetchAccountInfo = async (wallet) => {
    try {
      // Use login method to get user info
      const userInfo = await wallet.login()
      setAccount(userInfo)

      // Get balance information
      if (userInfo && userInfo.name) {
        try {
          const balanceStr = await getAccountBalance(wallet, 'eosio.token', userInfo.name, 'DFS');
          setBalance({ balance: balanceStr });
        } catch (balanceError) {
          console.error('获取余额失败:', balanceError);
          setBalance({ balance: '获取失败' });
        }
      }
    } catch (error) {
      console.error('获取账户信息失败:', error)
      message.error('获取账户信息失败')
    }
  }

  // Connect wallet
  const connectWallet = async () => {
    if (!dfsWallet) return

    try {
      setConnecting(true)
      console.log('开始连接钱包...');
      // Initialize DFSAPP wallet
      await dfsWallet.init(WalletType.DFSWALLET)
      console.log('DFSAPP钱包已初始化');
      // Login to get user info
      const userInfo = await dfsWallet.login()
      console.log('登录成功，用户信息:', userInfo);
      setAccount(userInfo)
      setConnected(true)

      // Get balance
      if (userInfo && userInfo.name) {
        try {
          console.log('尝试获取余额...');
          const balanceStr = await getAccountBalance(dfsWallet, 'eosio.token', userInfo.name, 'DFS');
          setBalance({ balance: balanceStr });
        } catch (balanceError) {
          console.error('获取余额失败:', balanceError);
          setBalance({ balance: '获取失败' });
        }
      }

      message.success('钱包连接成功')
    } catch (error) {
      console.error('钱包连接失败:', error)
      message.error('钱包连接失败: ' + (error.message || String(error)))
    } finally {
      setConnecting(false)
    }
  }

  // Disconnect wallet
  const disconnectWallet = async () => {
    if (!dfsWallet) return

    try {
      // Call logout method
      dfsWallet.logout()
      setConnected(false)
      setAccount(null)
      setBalance(null)
      setSelectedCat(null)
      message.success('钱包已断开连接')
    } catch (error) {
      console.error('断开钱包连接失败:', error)
      message.error('断开钱包连接失败: ' + (error.message || String(error)))
    }
  }

  // Handle cat selection
  const handleCatSelect = (catId) => {
    const cat = catList.find(c => c.id === catId);
    setSelectedCat(cat)
    setCatDetailsVisible(true)
  }

  // Handle cat action completion refresh
  const handleCatActionComplete = () => {
    setRefreshCats(prev => prev + 1)
  }

  // Mint new cat
  const handleMintCat = async () => {
    if (!dfsWallet || !account) {
      message.warning('请先连接钱包');
      return;
    }

    try {
      setMintingCat(true);
      const newCat = await mintCat(dfsWallet, account.name);
      message.success('猫咪铸造成功！');

      // Refresh cat list
      setRefreshCats(prev => prev + 1);
    } catch (error) {
      console.error('铸造猫咪失败:', error);
      message.error('铸造猫咪失败: ' + (error.message || String(error)));
    } finally {
      setMintingCat(false);
    }
  };

  // Get cats list
  useEffect(() => {
    const fetchCats = async () => {
      if (!dfsWallet || !account || !connected) return;

      try {
        const cats = await getUserCats(dfsWallet, account.name);
        setCatList(cats);

        // If there are cats but none selected, default select first one
        if (cats.length > 0 && !selectedCat) {
          setSelectedCat(cats[0]);
        }
      } catch (error) {
        console.error('获取猫咪列表失败:', error);
      }
    };

    fetchCats();
  }, [dfsWallet, account, connected, refreshCats]);

  // Define tab items
  const tabItems = [
    {
      key: 'home',
      label: (
        <span>
          <HomeOutlined />
          主页
        </span>
      ),
      children: (
        <div className="tab-content">
          <CatList
            DFSWallet={dfsWallet}
            userInfo={account}
            onSelectCat={handleCatSelect}
            refreshTrigger={refreshCats}
            selectedCatId={selectedCat?.id}
            onMintCat={handleMintCat}
            loading={connecting || mintingCat}
          />
        </div>
      )
    },
          {
        key: 'ranking',
        label: (
          <span>
            <TrophyOutlined />
            排行榜
          </span>
        ),
        children: (
          <div className="tab-content">
            <RankingList DFSWallet={dfsWallet} />
          </div>
        )
      }
      ,
    {
      key: 'market',
      label: (
        <span>
          <ShopOutlined />
          市场
        </span>
      ),
      children: (
        <div className="tab-content">
          <p>市场功能即将推出...</p>
        </div>
      )
    }
  ];

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          {/* Logo和标题区域 */}
          <div className="logo-section">
            <div className="logo">
              <img
                src="https://s1.imagehub.cc/images/2025/06/11/c34dd32ef2c2206b6a77cd970cd5818b.png"
                alt="猫星球"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <Title level={4} style={{ margin: 0, color: 'white' }}>
              猫星球
            </Title>
          </div>

          {/* Wallet connection info and buttons */}
          <div className="wallet-section">
            {connected ? (
              <>
                <div className="account-info">
                  <Text style={{ color: 'white', marginRight: 10 }}>
                    {account?.name}
                  </Text>
                  {balance && (
                    <Tag color="gold">{balance.balance}</Tag>
                  )}
                </div>
                <Button
                  danger
                  icon={<LogoutOutlined />}
                  onClick={disconnectWallet}
                >
                  断开连接
                </Button>
              </>
            ) : (
              <Button
                type="primary"
                icon={<WalletOutlined />}
                onClick={connectWallet}
                loading={connecting}
              >
                连接钱包
              </Button>
            )}
          </div>
        </div>
      </Header>

      <Content className="app-content">
        {connected ? (
          <div className="content-container">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              className="main-tabs"
              tabBarStyle={{ marginBottom: 16 }}
              items={tabItems}
            />
          </div>
        ) : (
          <div className="connect-prompt">
            <WalletOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <p>请连接DFS钱包开始</p>
            <Button
              type="primary"
              size="large"
              onClick={connectWallet}
              loading={connecting}
            >
              连接DFS钱包
            </Button>
          </div>
        )}
      </Content>

      {/* Cat detail modal */}
      <Modal
        title="猫咪详情"
        open={catDetailsVisible}
        onCancel={() => setCatDetailsVisible(false)}
        footer={null}
        width={700}
      >
        {selectedCat && (
          <CatDetail
            DFSWallet={dfsWallet}
            userInfo={account}
            selectedCat={selectedCat}
            refreshCats={handleCatActionComplete}
          />
        )}
      </Modal>
    </Layout>
  )
}

export default App