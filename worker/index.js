// DFS API代理Worker
// 部署到Cloudflare Workers

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * 处理请求
 * @param {Request} request
 */
async function handleRequest(request) {
  // 处理OPTIONS请求（预检请求）
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }
  
  // 允许的API端点
  const allowedEndpoints = [
    '/chain/get_table_rows',
    '/chain/get_currency_balance',
    '/chain/get_account',
    '/chain/get_info',
    '/chain/push_transaction'
  ];
  
  // 解析请求URL
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 如果是根路径，返回欢迎信息
  if (path === '/' || path === '/api') {
    return new Response(JSON.stringify({
      status: 'ok',
      message: 'DFS API代理服务正常运行',
      allowed_endpoints: allowedEndpoints
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    });
  }
  
  const endpoint = path.replace('/api', '');
  
  // 检查是否是允许的API端点
  if (!allowedEndpoints.some(allowed => endpoint.startsWith(allowed))) {
    return new Response(JSON.stringify({
      error: '不允许的API端点',
      endpoint: endpoint,
      allowed: allowedEndpoints
    }), { 
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // 目标API基础URL
  const apiBaseUrl = 'https://api.dfs.land/v1';
  
  // 构建目标URL
  const targetUrl = apiBaseUrl + endpoint;
  
  // 创建新的请求
  const apiRequest = new Request(targetUrl, {
    method: request.method,
    body: request.method !== 'GET' ? await request.clone().text() : undefined,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'DFS-API-Proxy/1.0'
    }
  });
  
  try {
    // 发送请求到目标API
    const response = await fetch(apiRequest);
    
    // 获取响应数据
    const data = await response.text();
    
    // 创建新的响应，添加CORS头部
    return new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    });
  } catch (error) {
    // 返回错误响应
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// 处理OPTIONS请求（预检请求）
function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
} 