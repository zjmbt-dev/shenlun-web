# 申论备考训练系统

一个基于网页的申论备考训练系统，融合半月谈白鹭、B站小马哥（小题）和袁东（大作文）的解题方法论，以申论命题人和阅卷人的专业视角严格评判用户作答并提供多维度评分和改进建议。

## 功能特性

### 真题识别
- 联网搜索 + 真题库双通道匹配，自动定位考试年份、试卷类型、题号、原题
- 匹配成功后以真实阅卷采分点为评分基准，跳过通用推断

### 小题训练
- **归纳概括题**（含概括做法/问题/原因/经验/成效/变化/特点）：不写总括句，分条列要点，材料原词直抄
- **综合分析题**（词句理解/观点评析/现象分析/关系分析4子类）：总括句点题 + 分维度展开 + 回扣题干
- **公文写作题**：格式分+内容筛选（按文种目的取舍材料要点）+ 语言风格匹配
- 双视角参考作答：小马哥版（材料原词）+ 白鹭版（近义提炼轻串联）
- 默认精简格式输出，按需展开详细评分

### 大作文训练
- 袁东"三类型"主题判断（单主题/双主题AB型/双主题ABC型/多主题）
- 分论点关键词三步搜索法（题干→给定材料→前题材料）
- 阅卷人两轮评判（立意判定 + 多维细评）+ 创新加分机制
- 跑题给规范范文，不跑题给逐段优化版

### 命题预判
- 基于历年真题趋势（60%）+ 当年时政热点（40%）
- 支持国考（副省/地市/行政执法）、省考、事业单位

### 评分系统
- 采分点覆盖法（子项逐条核对）
- 大作文五维评分（立意准确性、结构规范性、论证充分性、素材运用、语言表达）

## 使用方法

1. 直接打开 `index.html` 文件即可使用
2. 或者部署到 GitHub Pages：
   - 创建 GitHub 仓库
   - 上传所有文件
   - 在仓库设置中启用 GitHub Pages
   - 选择主分支作为源

## 文件结构

```
shenlun-web/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 交互逻辑
└── README.md           # 项目说明
```

## 技术栈

- HTML5
- CSS3（Flexbox、Grid、动画）
- JavaScript（原生）
- 响应式设计

## 部署到 GitHub Pages

### 步骤 1：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写仓库名称（如：shenlun-web）
3. 选择公开（Public）
4. 点击 "Create repository"

### 步骤 2：上传文件

```bash
# 在项目目录中
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/shenlun-web.git
git push -u origin main
```

### 步骤 3：启用 GitHub Pages

1. 进入仓库设置（Settings）
2. 找到 "Pages" 选项
3. 在 "Source" 中选择 "Deploy from a branch"
4. 选择 "main" 分支
5. 点击 "Save"

### 步骤 4：访问网站

几分钟后，你的网站将可以通过以下地址访问：
```
https://你的用户名.github.io/shenlun-web/
```

## 本地开发

```bash
# 使用 Python 简单服务器
python -m http.server 8000

# 或者使用 Node.js
npx serve .

# 然后在浏览器中访问 http://localhost:8000
```

## 贡献指南

欢迎贡献代码、提出问题或建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License

## 致谢

- 半月谈白鹭 — 小题解题体系
- B站小马哥 — 概括与对策方法论
- 袁东 — 大作文类型框架

## 更新日志

| 日期 | 变更内容 |
|------|---------|
| 2026-06-04 | 首次发布：基础网页版本，包含小题训练、大作文训练、命题预判、评分系统 |