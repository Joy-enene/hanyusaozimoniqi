# 韩娱嫂子模拟器 · NCT WISH 定向版

> 基于 LLM 的交互式韩娱恋爱文游，含AI生成角色立绘和场景插图

## 🚀 本地运行（3步）

### 1️⃣ 安装依赖
```bash
cd 韩娱嫂子模拟器
npm install
```

### 2️⃣ 配置API

**最简单：DeepSeek**
1. 去 platform.deepseek.com 注册 → 创建 API Key
2. 改 server.js：
```javascript
const LLM_PROVIDER = 'deepseek';
// ...
deepseek: {
  token: 'sk-你的Key',
}
```

**如果要AI场景配图（可选，不影响文字游戏）：**
再配一个智谱CogView的Key（免费）：
```javascript
const IMAGE_CONFIG = {
  provider: 'zhipu',
  zhipu: {
    token: '你的智谱Key',
  }
};
```
不配图片Key也行，会用预设的本地场景图匹配。

### 3️⃣ 启动
```bash
node server.js
```
打开 http://localhost:3000 🎮

---

## 🎨 配图系统

游戏自带三层配图：

| 层级 | 内容 | 来源 |
|------|------|------|
| 角色立绘 | 6位男主头像+角色卡大图 | 已生成，本地imgs/目录 |
| 场景插图 | 电视台/练习室/演唱会/咖啡店/保姆车 | 已生成5张+AI实时生成 |
| 群聊头像 | 触发群聊时每个成员独立头像 | AI实时生成 |

**场景匹配逻辑：**
- DM回复中写"当前场景：xxx"
- 后端按关键词匹配本地图片（电视台→电视台场景图）
- 匹配不上时，用DM回复中的`[IMG_PROMPT]`调用CogView实时生成
- 都没有就不显示场景图，只显示剧情文字

---

## ☁️ 线上部署

### Render（免费）
1. 推到GitHub
2. render.com → 新建Web Service → 连仓库
3. Build: `npm install` / Start: `node server.js`
4. 环境变量填Key
5. 得到 `https://xxx.onrender.com`

### Railway / Zeabur（更稳定）
同上流程，自动分配域名

---

## 🔑 API申请地址

| 平台 | 地址 | 免费额度 | 用途 |
|------|------|---------|------|
| DeepSeek | platform.deepseek.com | 500万token | 剧情生成（必选） |
| 智谱 | open.bigmodel.cn | 有 | 场景配图（可选） |
| Coze | coze.cn开放平台 | 有 | 另一种LLM后端 |
| 月之暗面 | platform.moonshot.cn | 有 | 另一种LLM后端 |

---

## 📂 项目结构

```
韩娱嫂子模拟器/
├── index.html                  # 完整前端（封面+创建+游戏+配图）
├── server.js                   # 后端（LLM代理+图片生成+DM Prompt）
├── package.json
├── README.md
└── imgs/
    ├── 260527_00_生图/
    │   └── game_cover.jpg      # 游戏封面
    └── 260527_09_生图/
        ├── sion_portrait.jpg   # 吴是温立绘
        ├── riku_portrait.jpg   # 前田陆立绘
        ├── yushi_portrait.jpg  # 得能勇志立绘
        ├── jaehee_portrait.jpg # 金栽熙立绘
        ├── ryo_portrait.jpg    # 广濑辽立绘
        ├── sakuya_portrait.jpg # 藤永咲哉立绘
        ├── scene_tvstation.jpg # 电视台场景
        ├── scene_practice.jpg  # 练习室场景
        ├── scene_concert.jpg   # 演唱会场景
        ├── scene_cafe.jpg      # 咖啡店场景
        └── scene_van.jpg       # 保姆车场景
```

---

## 📝 作为课程作业

论文方向：《基于大语言模型的交互式叙事游戏设计与实现》

创新点：
1. 多维度属性约束叙事（好感度/保密度/警觉度联动影响剧情走向）
2. 分层事件引擎的Prompt设计（日常→危机→特殊触发线）
3. LLM+图像生成的多模态叙事（DM输出文字同时生成场景配图）
4. 第一视角信息有限性的prompt约束方法
