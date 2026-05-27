// server.js — 完整后端，服务静态文件 + API + 图片生成
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// ============================================================
// 🔧 配置区 — 改这里就行
// ============================================================
const LLM_PROVIDER = 'deepseek'; // 'coze' | 'deepseek' | 'zhipu' | 'moonshot'

const CONFIG = {
  coze: {
    apiUrl: 'https://api.coze.cn/v3/chat',
    botId: process.env.COZE_BOT_ID || '你的Bot_ID',
    token: process.env.COZE_API_TOKEN || '你的API_Token',
    model: 'doubao-pro-32k',
  },
  deepseek: {
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    token: process.env.DEEPSEEK_API_KEY ||'sk-0eff4fe033a64015a1a4a3f322cfd996',
    model: 'deepseek-chat',
  },
  zhipu: {
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    token: process.env.ZHIPU_API_KEY || '你的智谱_Key',
    model: 'glm-4-flash',
  },
  moonshot: {
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    token: process.env.MOONSHOT_API_KEY || '你的月之暗面_Key',
    model: 'moonshot-v1-8k',
  }
};

// 图片生成配置（用智谱CogView，免费额度够用）
const IMAGE_CONFIG = {
  provider: 'zhipu', // 'zhipu' (CogView) | 'siliconflow' | 'none'
  zhipu: {
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/images/generations',
    token: process.env.ZHIPU_API_KEY || process.env.IMAGE_API_KEY || '',
    model: 'cogview-3-flash',
  },
  siliconflow: {
    apiUrl: 'https://api.siliconflow.cn/v1/images/generations',
    token: process.env.SILICONFLOW_API_KEY || process.env.IMAGE_API_KEY || '',
    model: 'stabilityai/stable-diffusion-3-medium',
  }
};

// ============================================================
// 🎨 角色立绘映射（本地已生成的图片）
// ============================================================
const MEMBER_PORTRAITS = {
  sion:   'imgs/260527_09_生图/sion_portrait.jpg',
  riku:   'imgs/260527_09_生图/riku_portrait.jpg',
  yushi:  'imgs/260527_09_生图/yushi_portrait.jpg',
  jaehee: 'imgs/260527_09_生图/jaehee_portrait.jpg',
  ryo:    'imgs/260527_09_生图/ryo_portrait.jpg',
  sakuya: 'imgs/260527_09_生图/sakuya_portrait.jpg',
};

// 场景插图池（本地已生成）
const SCENE_IMAGES = {
  '电视台': 'imgs/260527_09_生图/scene_tvstation.jpg',
  '后门': 'imgs/260527_09_生图/scene_tvstation.jpg',
  '练习室': 'imgs/260527_09_生图/scene_practice.jpg',
  '演唱会': 'imgs/260527_09_生图/scene_concert.jpg',
  '舞台': 'imgs/260527_09_生图/scene_concert.jpg',
  '咖啡': 'imgs/260527_09_生图/scene_cafe.jpg',
  '便利店': 'imgs/260527_09_生图/scene_cafe.jpg',
  '保姆车': 'imgs/260527_09_生图/scene_van.jpg',
  '车内': 'imgs/260527_09_生图/scene_van.jpg',
  'van': 'imgs/260527_09_生图/scene_van.jpg',
};

// ============================================================
// 📝 DM 系统Prompt — 含配图指令
// ============================================================
const DM_SYSTEM_PROMPT = `你是韩娱嫂子模拟器的DM，负责剧情推进、NPC扮演、事件生成与属性结算。

核心规则：
1. 写实向韩娱恋爱模拟，非爽文。允许BE。
2. 七分甜三分虐。男主不是无条件恋爱脑，玩家不是天选之女。
3. 叙事信息有限性：只能写第一视角所见所闻。
4. 所有亲密关系仅发生在成年角色之间。
5. 禁止把现实艺人的真实婚恋、私生活写入游戏。
6. 禁止生成可误认为现实艺人真实照片的图像描述。

【回复格式要求】— 每次回复必须严格按以下格式：

═══ 属性面板 ═══
好感度：{数字} | 人气值：{数字} | 心情值：{数字} | 金钱：{数字} | 恋情保密度：{数字} | 公司警觉度：{数字} | 事业压力：{数字}
第{数字}周 | 当前场景：{地点}
当前男主：{成员名}
当前关系阶段：{阶段}

═══ 场景配图 ═══
[IMG_PROMPT: {用英文写一段画面描述，用于AI生成场景插图。描述应是环境氛围为主，不要出现清晰人脸。如：A rainy night at the back entrance of a Korean broadcasting station, wet asphalt reflecting neon lights, a black van parked nearby, moody atmosphere}]

═══ 剧情正文 ═══
{用第二人称写剧情，包含场景描写、对话、心理活动、NPC互动}

═══ 可选行动 ═══
A. {选项一}
B. {选项二}
C. {选项三}
D. 自由行动：由玩家输入

【配图规则】
- 每次回复必须在"场景配图"区域提供一段英文画面描述
- 描述重点：环境氛围、光影、色调，不要描述清晰人脸
- 风格关键词：cinematic anime illustration, detailed background
- 如果是亲密/对话场景：重点画环境和氛围，人物只画剪影或背影
- 如果触发【群聊】：每个出现的NCT WISH成员都需要单独的[AVATAR_PROMPT: 英文描述]

【属性规则】
- 好感度0-15=陌生人，16-30=有印象，31-50=产生兴趣，51-65=暧昧期，66-80=确认关系，81-90=热恋期，91-100=考验期
- 严禁跳级，好感度必须与剧情合理匹配
- 每个选择至少影响2项属性
- 心情值<20触发崩溃事件，保密度<30触发曝光危机，警觉度>80触发强制干预

【感情阶段限制】
- 陌生人：只能礼貌交流，最多"记住你""多看一眼"
- 有印象：记住名字习惯，简单关心，不得越界亲密
- 产生兴趣：主动制造对话，可出现私下讯息
- 暧昧期：明显拉扯吃醋试探，公司警觉度开始上升
- 确认关系：明确心意但不等于可以公开，保密度成核心压力
- 热恋期：甜度提升但危机概率大增，私生狗仔站姐构成威胁
- 考验期：进入结局分歧

【事件生成】每周提供2-3个随机事件，类型：日常/感情推进/韩娱工作/粉圈舆论/公司干预/经济学业/危机

【禁止事项】
- 禁止无缘无故让男主爱上玩家
- 禁止跳过暧昧直接确认关系
- 禁止每回合都甜，必须保留现实压力
- 禁止泄露NPC暗线
- 禁止把花园丝全部写成恶毒群体
- 禁止过度玛丽苏`;

// ============================================================
// 🗂️ 对话存储
// ============================================================
const sessions = {};

function getSession(id) {
  if (!sessions[id]) {
    sessions[id] = { messages: [], createdAt: Date.now(), images: {} };
  }
  return sessions[id];
}

// ============================================================
// 🎨 图片生成
// ============================================================

// 从DM回复中提取 [IMG_PROMPT: xxx]
function extractImagePrompt(reply) {
  const match = reply.match(/\[IMG_PROMPT:\s*([\s\S]+?)\]/);
  return match ? match[1].trim() : null;
}

// 从DM回复中提取头像 [AVATAR_PROMPT: xxx]
function extractAvatarPrompts(reply) {
  const results = [];
  const regex = /\[AVATAR_PROMPT:\s*([\s\S]+?)\]/g;
  let match;
  while ((match = regex.exec(reply)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

// 根据场景关键词匹配本地图片
function matchLocalScene(sceneName) {
  if (!sceneName) return null;
  for (const [keyword, imgPath] of Object.entries(SCENE_IMAGES)) {
    if (sceneName.includes(keyword)) {
      const fullPath = path.join(__dirname, imgPath);
      if (fs.existsSync(fullPath)) return imgPath;
    }
  }
  return null;
}

// 调用AI生成图片（CogView / SiliconFlow）
async function generateImage(prompt) {
  const cfg = IMAGE_CONFIG[IMAGE_CONFIG.provider];
  if (!cfg || !cfg.token) return null;

  try {
    const res = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model,
        prompt: prompt + ', cinematic anime illustration style, detailed, no text, no watermark',
        size: '1792x1024',
      })
    });
    const data = await res.json();
    const imageUrl = data.data?.[0]?.url;
    if (imageUrl) {
      // 下载图片到本地
      const imgDir = path.join(__dirname, 'imgs', 'generated');
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
      const fileName = 'scene_' + Date.now() + '.jpg';
      const filePath = path.join(imgDir, fileName);
      
      const imgRes = await fetch(imageUrl);
      const buffer = await imgRes.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
      
      return 'imgs/generated/' + fileName;
    }
  } catch (err) {
    console.error('Image generation failed:', err.message);
  }
  return null;
}

// ============================================================
// 🤖 LLM调用
// ============================================================

async function callCoze(messages, userId) {
  const cfg = CONFIG.coze;
  const createRes = await fetch(cfg.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bot_id: cfg.botId,
      user_id: userId,
      stream: false,
      auto_save_history: true,
      additional_messages: messages.map(m => ({
        role: m.role, content: m.content, content_type: 'text'
      }))
    })
  });
  const createData = await createRes.json();
  if (createData.code !== 0) throw new Error(`Coze Error: ${createData.msg}`);
  const chatId = createData.data.id;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const checkRes = await fetch(
      `https://api.coze.cn/v3/chat/retrieve?chat_id=${chatId}&user_id=${userId}`,
      { headers: { 'Authorization': `Bearer ${cfg.token}` } }
    );
    const checkData = await checkRes.json();
    if (checkData.data?.status === 'completed') {
      const msgRes = await fetch(
        `https://api.coze.cn/v3/chat/message/list?chat_id=${chatId}&user_id=${userId}`,
        { headers: { 'Authorization': `Bearer ${cfg.token}` } }
      );
      const msgData = await msgRes.json();
      const answer = msgData.data?.find(m => m.role === 'assistant' && m.type === 'answer');
      return answer?.content || '...';
    }
    if (checkData.data?.status === 'failed') throw new Error('Coze chat failed');
  }
  throw new Error('Coze timeout');
}

async function callOpenAICompatible(messages) {
  const cfg = CONFIG[LLM_PROVIDER];
  const res = await fetch(cfg.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: messages,
      temperature: 0.85,
      max_tokens: 2500,
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '...';
}

async function callLLM(messages, userId) {
  if (LLM_PROVIDER === 'coze') return callCoze(messages, userId);
  return callOpenAICompatible(messages);
}

// ============================================================
// 🎮 API路由
// ============================================================

// 获取男主立绘
app.get('/api/portrait/:member', (req, res) => {
  const member = req.params.member;
  const portraitPath = MEMBER_PORTRAITS[member];
  if (!portraitPath) return res.status(404).json({ error: '角色不存在' });
  
  const fullPath = path.join(__dirname, portraitPath);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: '立绘文件不存在' });
  
  res.sendFile(fullPath);
});

// 获取场景图
app.get('/api/scene/:sceneName', (req, res) => {
  const localPath = matchLocalScene(decodeURIComponent(req.params.sceneName));
  if (localPath) {
    return res.sendFile(path.join(__dirname, localPath));
  }
  res.status(404).json({ error: '无匹配场景图' });
});

// 开始新游戏
app.post('/api/start', async (req, res) => {
  const { playerData, gameState } = req.body;
  const sessionId = 'game_' + Date.now();
  const session = getSession(sessionId);

  const contextMsg = `[游戏初始化]
玩家：${playerData.name}，${playerData.age}岁
身份代码：${playerData.identity}
攻略对象：${playerData.member}
追星程度：${playerData.fanLevel}
剧情节奏：${playerData.pace}

请根据以上信息生成第1周的剧情。`;

  session.messages.push({ role: 'user', content: contextMsg });
  session.member = playerData.member;

  try {
    const reply = await callLLM(
      [{ role: 'system', content: DM_SYSTEM_PROMPT }, ...session.messages],
      sessionId
    );
    session.messages.push({ role: 'assistant', content: reply });

    // 处理配图
    const responseData = await processImages(reply, session);

    res.json({ 
      sessionId, 
      reply: cleanReplyForFrontend(reply),
      ...responseData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 推进剧情
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: 'Session不存在' });

  session.messages.push({ role: 'user', content: message });
  if (session.messages.length > 40) {
    session.messages = session.messages.slice(-40);
  }

  try {
    const reply = await callLLM(
      [{ role: 'system', content: DM_SYSTEM_PROMPT }, ...session.messages],
      sessionId
    );
    session.messages.push({ role: 'assistant', content: reply });

    const responseData = await processImages(reply, session);

    res.json({ 
      reply: cleanReplyForFrontend(reply),
      ...responseData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 处理配图：提取prompt → 匹配本地/生成新图 → 返回路径
async function processImages(reply, session) {
  const result = { sceneImage: null, portraitImage: null };

  // 男主立绘
  if (session.member && MEMBER_PORTRAITS[session.member]) {
    result.portraitImage = '/api/portrait/' + session.member;
  }

  // 场景图：先尝试本地匹配，再尝试AI生成
  const sceneMatch = reply.match(/当前场景[：:]\s*(.+?)[\n\r]/);
  const sceneName = sceneMatch ? sceneMatch[1].trim() : '';
  
  const localScene = matchLocalScene(sceneName);
  if (localScene) {
    result.sceneImage = '/' + localScene;
  } else {
    // 尝试AI生成
    const imgPrompt = extractImagePrompt(reply);
    if (imgPrompt && IMAGE_CONFIG[IMAGE_CONFIG.provider]?.token) {
      const generatedPath = await generateImage(imgPrompt);
      if (generatedPath) {
        result.sceneImage = '/' + generatedPath;
      }
    }
  }

  return result;
}

// 清理回复中的图片prompt标签（前端不需要看到）
function cleanReplyForFrontend(reply) {
  return reply
    .replace(/\[IMG_PROMPT:\s*[\s\S]+?\]/g, '')
    .replace(/\[AVATAR_PROMPT:\s*[\s\S]+?\]/g, '')
    .replace(/═══\s*场景配图\s*═══/g, '')
    .trim();
}

// 获取角色信息提示
app.post('/api/init-scene', (req, res) => {
  const { playerData } = req.body;
  const scenes = {
    A: '首尔某大学附近的便利店，你正在上夜班补生活费。窗外偶尔闪过保姆车的灯光。',
    B: 'NCT WISH演唱会的场外应援区，你举着灯牌站在花园丝人海中。',
    C: '经纪公司大楼12层，你抱着文件走向会议室，走廊尽头传来练习室的音乐声。',
    D: '音乐银行后台通道，你正在核对今天的走位表，灯光昏暗，空气中弥漫着发胶味。',
    E: '待机室，你正在整理妆造台，镜前灯把一切照得苍白。',
    F: '采访翻译间，你调试着同传设备，还有十分钟NCT WISH就要进来了。',
    G: '首尔弘大入口的咖啡店，你擦着桌子，门口的风铃又响了。',
    H: '首尔的某个角落，你正过着自己的生活，不知道命运即将转弯。'
  };
  res.json({ scene: scenes[playerData.identity] || scenes.H });
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n');
    console.log('韩娱嫂子模拟器 DM Server');
    console.log(`http://localhost:${PORT}`);
    console.log(`LLM Provider: ${LLM_PROVIDER}`);
    console.log(`Image Provider: ${IMAGE_CONFIG.provider}`);
    console.log('');
});