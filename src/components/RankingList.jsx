import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Spin, Tag, Typography, message, Tooltip } from 'antd';
import { TrophyOutlined, ReloadOutlined } from '@ant-design/icons';
import { getAllCats } from '../utils/chainOperations';
import { getCatColorClass } from '../utils/catGeneParser';
import './RankingList.css';

const { Title } = Typography;

const RankingList = ({ DFSWallet }) => {
  const [catsList, setCatsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 获取排行榜数据
  const fetchRankingData = async () => {
    if (!DFSWallet) return;
    
    try {
      setLoading(true);
      const cats = await getAllCats(DFSWallet, 100); // 获取最多100只猫咪
      console.log(cats);
      setCatsList(cats);
      setPagination(prev => ({
        ...prev,
        total: cats.length,
      }));
    } catch (error) {
      console.error('获取排行榜数据失败:', error);
      message.error('获取排行榜数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    fetchRankingData();
  }, [DFSWallet]);

  // 处理表格分页变化
  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  // 处理刷新按钮点击
  const handleRefresh = () => {
    fetchRankingData();
  };

  // 定义表格列
  const columns = [
    {
      title: '排名',
      key: 'ranking',
      width: 80,
      render: (_, __, index) => {
        const rank = (pagination.current - 1) * pagination.pageSize + index + 1;
        if (rank === 1) {
          return (
            <div className="ranking-badge gold">
              <TrophyOutlined /> 1
            </div>
          );
        } else if (rank === 2) {
          return (
            <div className="ranking-badge silver">
              <TrophyOutlined /> 2
            </div>
          );
        } else if (rank === 3) {
          return (
            <div className="ranking-badge bronze">
              <TrophyOutlined /> 3
            </div>
          );
        }
        return <div className="ranking-number">{rank}</div>;
      },
    },
    {
      title: '猫咪ID',
      dataIndex: 'id',
      key: 'id',
      width: 100, // 增加列宽
      render: (id, record) => (
        <div className="cat-id">
             #{id}
        </div>
      ),
    },
    {
      title: '所有者',
      dataIndex: 'owner',
      key: 'owner',
      width: 100, // 设置列宽
      render: (owner) => (
        <Tooltip title={owner} placement="topLeft">
          <Tag color="blue">{owner}</Tag>
        </Tooltip>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 100, // 设置列宽
      sorter: (a, b) => a.level - b.level,
      sortDirections: ['descend', 'ascend'],
      defaultSortOrder: 'descend',
      render: (level) => <Tag color="green">Lv.{level}</Tag>,
    },
    {
      title: '经验',
      dataIndex: 'experience',
      key: 'experience',
      width: 100, // 设置列宽
      sorter: (a, b) => a.experience - b.experience,
      render: (experience) => experience || 0,
    },
    {
      title: '体力',
      dataIndex: 'stamina',
      key: 'stamina',
      width: 100, // 设置列宽
      render: (stamina, record) => {
        const staminaValue = stamina ? (stamina / 100).toFixed(2) : '0.00';
        const maxStamina = record.maxStamina ? (record.maxStamina / 100).toFixed(2) : '100.00';
        return `${staminaValue}/${maxStamina}`;
      },
    },
  ];

  return (
    <div className="ranking-list-container">
      <Card className="ranking-card">
        <div className="ranking-header">
          <Title level={4}>
            <TrophyOutlined /> 猫咪排行榜
          </Title>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </div>
        
        <Spin spinning={loading}>
          <Table
            dataSource={catsList}
            columns={columns}
            rowKey="id"
            pagination={pagination}
            onChange={handleTableChange}
            className="ranking-table"
            scroll={{ x: 'max-content' }} // 添加水平滚动
          />
        </Spin>
      </Card>
    </div>
  );
};

export default RankingList; 