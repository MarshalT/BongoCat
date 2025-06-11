const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS
app.use(cors());

// 解析JSON请求体
app.use(bodyParser.json());
// 解析URL编码的请求体
app.use(bodyParser.urlencoded({ extended: true }));

// 代理API请求
app.post('/api/chain/:endpoint', async (req, res) => {
  try {
    const endpoint = req.params.endpoint;
    const apiUrl = `https://api.dfs.land/v1/chain/${endpoint}`;
    
    console.log(`代理请求到: ${apiUrl}`);
    console.log('请求体:', req.body);
    
    const response = await axios.post(apiUrl, req.body);
    
    res.json(response.data);
  } catch (error) {
    console.error('代理请求失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.send('代理服务器正常运行');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`代理服务器运行在端口 ${PORT}`);
}); 