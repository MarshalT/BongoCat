import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Table, Progress, Tag, Divider, InputNumber, message } from 'antd';
import { BarChartOutlined, SettingOutlined, ExperimentOutlined } from '@ant-design/icons';
import { 
  calculateRarityWithStrategy, 
  RARITY_STRATEGIES, 
  getRarityDistributionInfo,
  getAvailableStrategies,
  calculateRarityStatistics,
  validateCustomProbabilities
} from '../utils/rarityController.js';
import { getRarityConfig } from '../utils/catGeneParser.js';

const { Option } = Select;

const RarityController = () => {
  const [selectedStrategy, setSelectedStrategy] = useState(RARITY_STRATEGIES.REALISTIC);
  const [simulationCount, setSimulationCount] = useState(1000);
  const [simulationResults, setSimulationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customProbabilities, setCustomProbabilities] = useState(Array(16).fill(6.25));

  // 生成随机基因值
  const generateRandomGene = () => {
    return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  };

  // 运行稀有度分布模拟
  const runSimulation = async () => {
    setLoading(true);
    
    try {
      const rarities = [];
      
      for (let i = 0; i < simulationCount; i++) {
        const gene = generateRandomGene();
        const rarity = calculateRarityWithStrategy(
          gene, 
          selectedStrategy, 
          selectedStrategy === RARITY_STRATEGIES.CUSTOM ? customProbabilities : null
        );
        rarities.push(rarity);
      }
      
      const statistics = calculateRarityStatistics(rarities);
      setSimulationResults(statistics);
      
      message.success(`成功模拟 ${simulationCount} 只猫咪的稀有度分布`);
    } catch (error) {
      console.error('模拟失败:', error);
      message.error('模拟过程中出现错误');
    } finally {
      setLoading(false);
    }
  };

  // 重置自定义概率为均匀分布
  const resetCustomProbabilities = () => {
    setCustomProbabilities(Array(16).fill(6.25));
  };

  // 应用预设概率分布
  const applyPresetDistribution = (strategy) => {
    const distribution = getRarityDistributionInfo(strategy);
    setCustomProbabilities([...distribution.probabilities]);
  };

  // 验证自定义概率
  const validateProbabilities = () => {
    const validation = validateCustomProbabilities(customProbabilities);
    if (!validation.valid) {
      message.error(`概率设置无效: ${validation.errors.join(', ')}`);
      return false;
    }
    return true;
  };

  // 表格列定义
  const columns = [
    {
      title: '稀有度',
      dataIndex: 'rarity',
      key: 'rarity',
      render: (rarity) => {
        const config = getRarityConfig(rarity);
        return (
          <Tag color={config.color} style={{ color: 'white', fontWeight: 'bold' }}>
            {config.name}
          </Tag>
        );
      }
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: '实际概率',
      dataIndex: 'percentage',
      key: 'actualPercentage',
      render: (percentage) => `${percentage}%`,
      sorter: (a, b) => parseFloat(a.percentage) - parseFloat(b.percentage),
    },
    {
      title: '期望概率',
      key: 'expectedPercentage',
      render: (_, record) => {
        const distribution = getRarityDistributionInfo(selectedStrategy);
        const expected = selectedStrategy === RARITY_STRATEGIES.CUSTOM 
          ? customProbabilities[record.rarity] 
          : distribution.probabilities[record.rarity];
        return `${expected.toFixed(2)}%`;
      }
    },
    {
      title: '偏差',
      key: 'deviation',
      render: (_, record) => {
        const distribution = getRarityDistributionInfo(selectedStrategy);
        const expected = selectedStrategy === RARITY_STRATEGIES.CUSTOM 
          ? customProbabilities[record.rarity] 
          : distribution.probabilities[record.rarity];
        const actual = parseFloat(record.percentage);
        const deviation = actual - expected;
        const color = Math.abs(deviation) > 1 ? (deviation > 0 ? 'red' : 'blue') : 'green';
        return (
          <span style={{ color }}>
            {deviation > 0 ? '+' : ''}{deviation.toFixed(2)}%
          </span>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Card title={
        <span>
          <BarChartOutlined style={{ marginRight: 8 }} />
          稀有度概率控制器
        </span>
      }>
        {/* 控制面板 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label>分布策略: </label>
              <Select
                value={selectedStrategy}
                onChange={setSelectedStrategy}
                style={{ width: 200 }}
              >
                {getAvailableStrategies().map(strategy => (
                  <Option key={strategy.key} value={strategy.key}>
                    {strategy.name}
                  </Option>
                ))}
              </Select>
            </div>
            
            <div>
              <label>模拟数量: </label>
              <InputNumber
                value={simulationCount}
                onChange={setSimulationCount}
                min={100}
                max={100000}
                step={100}
                style={{ width: 120 }}
              />
            </div>
            
            <Button 
              type="primary" 
              icon={<ExperimentOutlined />}
              onClick={runSimulation}
              loading={loading}
            >
              运行模拟
            </Button>
          </div>
        </div>

        {/* 自定义概率设置 */}
        {selectedStrategy === RARITY_STRATEGIES.CUSTOM && (
          <Card 
            size="small" 
            title={
              <span>
                <SettingOutlined style={{ marginRight: 8 }} />
                自定义概率设置
              </span>
            }
            style={{ marginBottom: 20 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {customProbabilities.map((prob, index) => {
                const config = getRarityConfig(index);
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Tag color={config.color} style={{ minWidth: 80, textAlign: 'center' }}>
                      {config.name}
                    </Tag>
                    <InputNumber
                      value={prob}
                      onChange={(value) => {
                        const newProbs = [...customProbabilities];
                        newProbs[index] = value || 0;
                        setCustomProbabilities(newProbs);
                      }}
                      min={0}
                      max={100}
                      step={0.01}
                      size="small"
                      style={{ width: 80 }}
                      formatter={value => `${value}%`}
                      parser={value => value.replace('%', '')}
                    />
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="small" onClick={resetCustomProbabilities}>
                重置为均匀分布
              </Button>
              <Button size="small" onClick={() => applyPresetDistribution(RARITY_STRATEGIES.REALISTIC)}>
                应用真实分布
              </Button>
              <Button size="small" onClick={() => applyPresetDistribution(RARITY_STRATEGIES.GENEROUS)}>
                应用慷慨分布
              </Button>
              <Button size="small" onClick={validateProbabilities}>
                验证概率
              </Button>
            </div>
            
            <div style={{ marginTop: 8 }}>
              <span>总概率: {customProbabilities.reduce((a, b) => a + b, 0).toFixed(2)}%</span>
            </div>
          </Card>
        )}

        {/* 模拟结果 */}
        {simulationResults && (
          <>
            <Divider>模拟结果</Divider>
            
            {/* 概览统计 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <Card size="small" title="普通级别">
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {simulationResults.summary.common + simulationResults.summary.uncommon}
                </div>
                <div style={{ color: '#666' }}>
                  {((simulationResults.summary.common + simulationResults.summary.uncommon) / simulationResults.total * 100).toFixed(1)}%
                </div>
              </Card>
              
              <Card size="small" title="稀有级别">
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {simulationResults.summary.rare + simulationResults.summary.epic}
                </div>
                <div style={{ color: '#666' }}>
                  {((simulationResults.summary.rare + simulationResults.summary.epic) / simulationResults.total * 100).toFixed(1)}%
                </div>
              </Card>
              
              <Card size="small" title="传奇级别">
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>
                  {simulationResults.summary.legendary + simulationResults.summary.mythical}
                </div>
                <div style={{ color: '#666' }}>
                  {((simulationResults.summary.legendary + simulationResults.summary.mythical) / simulationResults.total * 100).toFixed(1)}%
                </div>
              </Card>
            </div>

            {/* 详细分布表格 */}
            <Table
              columns={columns}
              dataSource={simulationResults.distribution.map(item => ({
                ...item,
                key: item.rarity
              }))}
              pagination={false}
              size="small"
              title={() => `详细分布 (总计: ${simulationResults.total} 只猫咪)`}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default RarityController;
