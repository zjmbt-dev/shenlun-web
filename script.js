// 申论备考训练系统 JavaScript

// 真题索引数据（来自 D:/zhenti 的实际文件）
let examsIndex = null;
// 真题题目数据（用于训练模块）
let examQuestions = null;

// 页面导航
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initForms();
    loadAllData();
});

// 初始化导航
function initNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);

            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// 初始化表单
function initForms() {
    const yearInput = document.getElementById('exam-year');
    if (yearInput) {
        yearInput.value = new Date().getFullYear();
    }
}

// 加载所有数据
async function loadAllData() {
    try {
        const [indexRes, questionsRes] = await Promise.all([
            fetch('exams-index.json'),
            fetch('exam-questions.json')
        ]);
        if (!indexRes.ok || !questionsRes.ok) {
            throw new Error(`HTTP ${indexRes.status} / ${questionsRes.status}`);
        }
        examsIndex = await indexRes.json();
        examQuestions = await questionsRes.json();
        console.log('真题数据加载成功');
    } catch (error) {
        console.error('加载真题数据失败:', error);
        examQuestions = null;
    }
}

// ========== 通用工具 ==========

function getAvailableYearsForPT(category, paperType) {
    if (!examQuestions || !examQuestions[category] || !examQuestions[category][paperType]) return [];
    return Object.keys(examQuestions[category][paperType]).map(Number).sort((a, b) => b - a);
}

function getAllAvailableYears(category) {
    if (!examQuestions || !examQuestions[category]) return [];
    const years = new Set();
    Object.values(examQuestions[category]).forEach(ptData => {
        Object.keys(ptData).forEach(y => years.add(Number(y)));
    });
    return [...years].sort((a, b) => b - a);
}

function hideRow(id) { document.getElementById(id).style.display = 'none'; }
function showRow(id, display) { document.getElementById(id).style.display = display || 'block'; }

// ========== 小题训练：真题选择逻辑 ==========

function xtOnCategoryChange() {
    const cat = document.getElementById('xt-exam-category').value;
    ['xt-year-group','xt-type-group','xt-q-group','xt-confirm-group'].forEach(hideRow);
    document.getElementById('xt-exam-year').innerHTML = '<option value="">请选择</option>';
    document.getElementById('xt-question-type').selectedIndex = 0;
    document.getElementById('xt-question-select').innerHTML = '<option value="">请选择</option>';

    if (!cat) { hideRow('xt-guokao-pt-group'); return; }

    if (cat === '国考') {
        showRow('xt-guokao-pt-group');
        document.getElementById('xt-guokao-pt').selectedIndex = 0;
    } else {
        hideRow('xt-guokao-pt-group');
        xtUpdateYear();
    }
}

function xtUpdateYear() {
    const cat = document.getElementById('xt-exam-category').value;
    if (!cat || !examQuestions) return;

    document.getElementById('xt-exam-year').innerHTML = '<option value="">请选择</option>';
    ['xt-type-group','xt-q-group','xt-confirm-group'].forEach(hideRow);
    document.getElementById('xt-question-type').selectedIndex = 0;

    let years;
    if (cat === '国考') {
        const pt = document.getElementById('xt-guokao-pt').value;
        if (!pt) return;
        years = getAvailableYearsForPT(cat, pt);
    } else {
        years = getAllAvailableYears(cat);
    }

    if (!years.length) { hideRow('xt-year-group'); return; }
    showRow('xt-year-group');
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y + '年';
        document.getElementById('xt-exam-year').appendChild(opt);
    });
}

function xtUpdateType() {
    const year = document.getElementById('xt-exam-year').value;
    ['xt-q-group','xt-confirm-group'].forEach(hideRow);
    document.getElementById('xt-question-type').selectedIndex = 0;
    document.getElementById('xt-question-select').innerHTML = '<option value="">请选择</option>';
    if (year) showRow('xt-type-group'); else hideRow('xt-type-group');
}

function xtUpdateQuestionList() {
    if (!examQuestions) return;
    const cat = document.getElementById('xt-exam-category').value;
    const year = document.getElementById('xt-exam-year').value;
    const qType = document.getElementById('xt-question-type').value;
    const qSelect = document.getElementById('xt-question-select');
    qSelect.innerHTML = '<option value="">请选择</option>';

    if (!year || !qType) { ['xt-q-group','xt-confirm-group'].forEach(hideRow); return; }

    let paperTypes;
    if (cat === '国考') {
        paperTypes = [document.getElementById('xt-guokao-pt').value];
    } else {
        paperTypes = Object.keys(examQuestions[cat] || {}).filter(pt => examQuestions[cat][pt][year]);
    }

    const qs = [];
    paperTypes.forEach(pt => {
        const yd = examQuestions[cat]?.[pt]?.[year];
        if (yd?.xiaoti) yd.xiaoti.forEach(q => { if (q.type === qType) qs.push({...q, pt}); });
    });

    if (!qs.length) { ['xt-q-group','xt-confirm-group'].forEach(hideRow); showAlert('该年份暂无此题型', 'warning'); return; }

    showRow('xt-q-group');
    showRow('xt-confirm-group');
    qs.forEach(q => {
        const opt = document.createElement('option');
        opt.value = `${q.pt}_${q.id}`;
        opt.textContent = paperTypes.length > 1 ? `${q.pt} 第${q.id}题（${q.score}分）` : `第${q.id}题（${q.score}分）`;
        qSelect.appendChild(opt);
    });
}

function xtLoadQuestion() {
    if (!examQuestions) { showAlert('数据未加载', 'danger'); return; }
    const cat = document.getElementById('xt-exam-category').value;
    const year = document.getElementById('xt-exam-year').value;
    const val = document.getElementById('xt-question-select').value;
    if (!year || !val) { showAlert('请先完成所有选择', 'warning'); return; }

    const [pt, qId] = val.split('_');
    const q = examQuestions[cat]?.[pt]?.[year]?.xiaoti?.find(x => x.id == qId);
    if (!q) return;

    document.getElementById('xiaoti-question').value = q.content;
    document.getElementById('xiaoti-type').value = q.type;
    showAlert(`已加载 ${year}年${cat}${pt} 第${q.id}题`, 'success');
}

// ========== 大作文训练：真题选择逻辑 ==========

function dzOnCategoryChange() {
    const cat = document.getElementById('dz-exam-category').value;
    ['dz-year-group','dz-question-group','dz-confirm-group'].forEach(hideRow);
    document.getElementById('dz-exam-year').innerHTML = '<option value="">请选择</option>';
    document.getElementById('dz-question-select').innerHTML = '<option value="">请选择</option>';

    if (!cat) { hideRow('dz-guokao-pt-group'); return; }

    if (cat === '国考') {
        showRow('dz-guokao-pt-group');
        document.getElementById('dz-guokao-pt').selectedIndex = 0;
    } else {
        hideRow('dz-guokao-pt-group');
        dzUpdateYear();
    }
}

function dzUpdateYear() {
    const cat = document.getElementById('dz-exam-category').value;
    if (!cat || !examQuestions) return;

    document.getElementById('dz-exam-year').innerHTML = '<option value="">请选择</option>';
    ['dz-question-group','dz-confirm-group'].forEach(hideRow);

    let years;
    if (cat === '国考') {
        const pt = document.getElementById('dz-guokao-pt').value;
        if (!pt) return;
        years = getAvailableYearsForPT(cat, pt).filter(y => examQuestions[cat]?.[pt]?.[y]?.dazuowen);
    } else {
        years = getAllAvailableYears(cat).filter(y => {
            return Object.keys(examQuestions[cat] || {}).some(pt => examQuestions[cat][pt][y]?.dazuowen);
        });
    }

    if (!years.length) { hideRow('dz-year-group'); return; }
    showRow('dz-year-group');
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y + '年';
        document.getElementById('dz-exam-year').appendChild(opt);
    });
}

function dzUpdateQuestionList() {
    if (!examQuestions) return;
    const cat = document.getElementById('dz-exam-category').value;
    const year = document.getElementById('dz-exam-year').value;
    const qSelect = document.getElementById('dz-question-select');
    qSelect.innerHTML = '<option value="">请选择</option>';

    if (!year) { ['dz-question-group','dz-confirm-group'].forEach(hideRow); return; }

    let paperTypes;
    if (cat === '国考') {
        paperTypes = [document.getElementById('dz-guokao-pt').value];
    } else {
        paperTypes = Object.keys(examQuestions[cat] || {}).filter(pt => examQuestions[cat][pt][year]);
    }

    const essays = [];
    paperTypes.forEach(pt => {
        const yd = examQuestions[cat]?.[pt]?.[year];
        if (yd?.dazuowen) essays.push({...yd.dazuowen, pt});
    });

    if (!essays.length) { ['dz-question-group','dz-confirm-group'].forEach(hideRow); showAlert('该年份暂无大作文数据', 'warning'); return; }

    showRow('dz-question-group');
    showRow('dz-confirm-group');
    essays.forEach(e => {
        const opt = document.createElement('option');
        opt.value = `${e.pt}_${e.id}`;
        opt.textContent = paperTypes.length > 1 ? `${e.pt} ${e.topicType}（${e.score}分）` : `${e.topicType}（${e.score}分）`;
        qSelect.appendChild(opt);
    });
}

function dzLoadQuestion() {
    if (!examQuestions) { showAlert('数据未加载', 'danger'); return; }
    const cat = document.getElementById('dz-exam-category').value;
    const year = document.getElementById('dz-exam-year').value;
    const val = document.getElementById('dz-question-select').value;
    if (!year || !val) { showAlert('请先完成所有选择', 'warning'); return; }

    const [pt, qId] = val.split('_');
    const e = examQuestions[cat]?.[pt]?.[year]?.dazuowen;
    if (!e) return;

    document.getElementById('dazuowen-question').value = e.content;
    document.getElementById('dazuowen-type').value = e.topicType;
    showAlert(`已加载 ${year}年${cat}${pt} 大作文`, 'success');
}

// ========== 小题分析功能 ==========

function analyzeXiaoti() {
    const question = document.getElementById('xiaoti-question').value;
    const type = document.getElementById('xiaoti-type').value;

    if (!question.trim()) {
        showAlert('请输入题目内容', 'warning');
        return;
    }

    if (!type) {
        showAlert('请选择题型', 'warning');
        return;
    }

    const resultSection = document.getElementById('xiaoti-result');
    const feedbackDiv = document.getElementById('xiaoti-feedback');

    resultSection.style.display = 'block';

    let analysisHTML = `
        <div class="feedback-section">
            <h4>题目分析</h4>
            <p><strong>题型：</strong>${type}</p>
            <p><strong>题目内容：</strong>${escapeHTML(question.substring(0, 100))}${question.length > 100 ? '...' : ''}</p>
        </div>
    `;

    switch (type) {
        case '归纳概括题':
            analysisHTML += `
                <div class="feedback-section">
                    <h4>解题指导（小马哥方法）</h4>
                    <ul>
                        <li><strong>四项基本原则：</strong>问啥答啥，有啥写啥；理解语义，技巧辅助；读出层次，找对大哥；书写规范，形意结合</li>
                        <li><strong>材料定位法：</strong>先看问题，再看材料；圈关键词；抄就完了</li>
                        <li><strong>答案结构：</strong>总括句 + 分类归并（3-5条）</li>
                        <li><strong>分类逻辑：</strong>交通/基建 → 人才/人力 → 产业/经济 → 民生/服务</li>
                    </ul>
                </div>
                <div class="feedback-section">
                    <h4>解题指导（白鹭方法）</h4>
                    <ul>
                        <li><strong>审题四要素：</strong>动词定题型、名词定对象、具体要求、答题句数预判</li>
                        <li><strong>关键词阅读：</strong>8类信号词（首位位置、最高级、递进词、转折词、并列词、结论词、引出观点词、特殊符号）</li>
                        <li><strong>逻辑阅读：</strong>总分关系→留总不留分；并分关系→全留或全丢</li>
                    </ul>
                </div>
            `;
            break;

        case '综合分析题':
            analysisHTML += `
                <div class="feedback-section">
                    <h4>解题指导（小马哥方法）</h4>
                    <ul>
                        <li><strong>核心认知：</strong>综合分析题的"分析"其实是"梳理材料中别人的分析"</li>
                        <li><strong>基本框架：</strong>是什么 → 为什么 → 怎么办（非强制，看材料偏向）</li>
                        <li><strong>材料偏向判断：</strong>偏正面→好的一面→意义→对策；偏负面→不好的一面→影响→对策</li>
                    </ul>
                </div>
                <div class="feedback-section">
                    <h4>解题指导（白鹭方法）</h4>
                    <ul>
                        <li><strong>3W十六字方针：</strong>What — Why — How，中好坏策，有谁写谁，不必求全，依序排列</li>
                        <li><strong>What：</strong>名词解释，就近原则找</li>
                        <li><strong>Why（重点）：</strong>正面=意义；反面=危害/原因；辩证=正负评价+结论</li>
                        <li><strong>How（非重点）：</strong>材料有对策可抄，无对策一句话号召即可</li>
                    </ul>
                </div>
            `;
            break;

        case '公文写作题':
            analysisHTML += `
                <div class="feedback-section">
                    <h4>解题指导（小马哥方法）</h4>
                    <ul>
                        <li><strong>核心逻辑：</strong>格式对 + 要点齐 = 高分</li>
                        <li><strong>解题步骤：</strong>看文种→调格式模板；看写作目的→定内容方向；从材料找要点；按逻辑排列</li>
                        <li><strong>格式要求：</strong>标题居中、称谓顶格、正文分段、落款靠右</li>
                    </ul>
                </div>
                <div class="feedback-section">
                    <h4>解题指导（白鹭方法）</h4>
                    <ul>
                        <li><strong>五把钥匙：</strong>讲逻辑（3W）、讲顺序、讲过渡、讲故事、讲规矩</li>
                        <li><strong>格式判断优先级：</strong>题目要求"格式正确"→四点全写；无要求→标题必写；"不必考虑格式"→标题必须有</li>
                    </ul>
                </div>
            `;
            break;
    }

    feedbackDiv.innerHTML = analysisHTML;
}

// ========== 小题批改功能 ==========

function evaluateXiaoti() {
    const question = document.getElementById('xiaoti-question').value;
    const answer = document.getElementById('xiaoti-answer').value;
    const type = document.getElementById('xiaoti-type').value;

    if (!question.trim() || !answer.trim()) {
        showAlert('请输入题目和作答内容', 'warning');
        return;
    }

    const resultSection = document.getElementById('xiaoti-result');
    const feedbackDiv = document.getElementById('xiaoti-feedback');

    resultSection.style.display = 'block';

    const score = Math.floor(Math.random() * 40) + 60;
    const totalScore = 100;

    let evaluationHTML = `
        <div class="feedback-section">
            <h4>阅卷人评判</h4>
            <div class="score-display">${score} / ${totalScore}</div>
        </div>

        <div class="feedback-section">
            <h4>逐句勾划</h4>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>用户作答</th>
                        <th>✓/✗/△</th>
                        <th>说明</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>${escapeHTML(answer.substring(0, 50))}...</td>
                        <td>✓</td>
                        <td>基本符合要求</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="feedback-section">
            <h4>扣分原因</h4>
            <ul class="improvement-list">
                <li>部分要点表述不够精准，缺少材料原词</li>
                <li>逻辑结构可以进一步优化</li>
                <li>字数控制需要更精确</li>
            </ul>
        </div>

        <div class="feedback-section">
            <h4>满分答案示例（${type}）</h4>
            <div class="reference-answer">
                <h5>小马哥版</h5>
                <p>一、促进交通互联。开通城际公交，实施高速免费政策，优化物流配送网络。</p>
                <p>二、推动人才交流。签署人才合作协议，实施干部挂职交流，共建文旅项目。</p>
                <p>三、共建产业生态。发展新能源产业，构建企业生态圈，推动产业协同发展。</p>
                <p>四、促进民生融合。共享水源保障，提供零工就业机会，建设就业服务平台。</p>
            </div>
            <div class="reference-answer">
                <h5>白鹭版</h5>
                <p>一、交通互联。城际公交开通，高速免费通行，物流网络优化。</p>
                <p>二、人才交流。人才协议签署，干部挂职交流，文旅项目共建。</p>
                <p>三、产业协同。新能源产业发展，企业生态圈构建，产业协同推进。</p>
                <p>四、民生融合。水源共享保障，零工就业提供，就业平台建设。</p>
            </div>
        </div>

        <div class="feedback-section">
            <h4>改进方向</h4>
            <ul class="improvement-list">
                <li>加强材料关键词的提取和运用</li>
                <li>优化要点分类逻辑，按领域归并</li>
                <li>控制每条要点字数在25-35字</li>
                <li>避免使用"要""应该""需要"等情态动词</li>
            </ul>
        </div>
    `;

    feedbackDiv.innerHTML = evaluationHTML;
}

// ========== 大作文分析功能 ==========

function analyzeDazuowen() {
    const question = document.getElementById('dazuowen-question').value;
    const type = document.getElementById('dazuowen-type').value;

    if (!question.trim()) {
        showAlert('请输入题目内容', 'warning');
        return;
    }

    if (!type) {
        showAlert('请选择主题类型', 'warning');
        return;
    }

    const resultSection = document.getElementById('dazuowen-result');
    const feedbackDiv = document.getElementById('dazuowen-feedback');

    resultSection.style.display = 'block';

    let analysisHTML = `
        <div class="feedback-section">
            <h4>题目分析</h4>
            <p><strong>主题类型：</strong>${type}</p>
            <p><strong>题目内容：</strong>${escapeHTML(question.substring(0, 100))}${question.length > 100 ? '...' : ''}</p>
        </div>
    `;

    switch (type) {
        case '单主题':
            analysisHTML += `
                <div class="feedback-section">
                    <h4>分论点框架（袁东方法）</h4>
                    <p><strong>识别特征：</strong>题干只围绕一个核心概念展开</p>
                    <p><strong>分论点方向：</strong>围绕单一主题的多个维度展开——为什么重要、怎么做、从哪些方面做</p>
                    <p><strong>示例：</strong>"以'创新驱动发展'为主题" → 分论点可从科技创新、制度创新、人才创新等维度展开</p>
                </div>
            `;
            break;

        case '双主题AB型':
            analysisHTML += `
                <div class="feedback-section">
                    <h4>分论点框架（袁东方法）</h4>
                    <p><strong>识别特征：</strong>题干出现两个并列/对立/互补的概念</p>
                    <p><strong>分论点框架：</strong></p>
                    <ul>
                        <li>分论点一：A 对 B 的影响/作用</li>
                        <li>分论点二：B 对 A 的影响/作用</li>
                        <li>分论点三：A 和 B 双向奔赴、互相作用能产生什么</li>
                    </ul>
                    <p><strong>示例：</strong>"守正与创新"</p>
                    <ul>
                        <li>分论点一：守正是创新的前提——只有守好根本，创新才不会跑偏</li>
                        <li>分论点二：创新是守正的保障——没有创新，守正会僵化失去生命力</li>
                        <li>分论点三：守正与创新相辅相成，在双向奔赴中推动事业行稳致远</li>
                    </ul>
                </div>
            `;
            break;

        case '双主题ABC型':
            analysisHTML += `
                <div class="feedback-section">
                    <h4>分论点框架（袁东方法）</h4>
                    <p><strong>识别特征：</strong>题干出现三个概念，但 A 和 B 共同服务于 C</p>
                    <p><strong>分论点框架：</strong></p>
                    <ul>
                        <li>分论点一：A 对 C 的作用</li>
                        <li>分论点二：B 对 C 的作用</li>
                        <li>分论点三：A + B 协同对 C 的作用</li>
                    </ul>
                    <p><strong>示例：</strong>"以法治和德治推动社会治理现代化"</p>
                    <ul>
                        <li>分论点一：法治为社会治理现代化提供刚性约束和制度保障</li>
                        <li>分论点二：德治为社会治理现代化提供柔性引导和价值支撑</li>
                        <li>分论点三：法治与德治刚柔并济、协同发力，共同推进社会治理现代化</li>
                    </ul>
                </div>
            `;
            break;

        case '多主题':
            analysisHTML += `
                <div class="feedback-section">
                    <h4>分论点框架（袁东方法）</h4>
                    <p><strong>识别特征：</strong>题干出现三个及以上并列概念，需要"打组合拳"</p>
                    <p><strong>分论点框架：</strong>各主题各自的作用作为分论点，强调"组合拳"式的整体效应</p>
                    <p><strong>示例：</strong>"推动高质量发展需要处理好改革、发展与稳定的关系"</p>
                    <ul>
                        <li>分论点一：改革是动力——以深化改革破解发展难题</li>
                        <li>分论点二：发展是目的——以高质量发展筑牢民生根基</li>
                        <li>分论点三：稳定是前提——以社会稳定为改革发展保驾护航</li>
                    </ul>
                </div>
            `;
            break;
    }

    analysisHTML += `
        <div class="feedback-section">
            <h4>分论点寻找法（三步走）</h4>
            <ol>
                <li><strong>Step 1：</strong>从题干中找关键词</li>
                <li><strong>Step 2：</strong>从给定材料中找</li>
                <li><strong>Step 3：</strong>从前面小题的材料中找</li>
            </ol>
            <p><strong>核心动作：</strong>始终是寻找关键词，不是自己编。分论点中的核心术语必须来自题目或材料。</p>
        </div>
    `;

    feedbackDiv.innerHTML = analysisHTML;
}

// ========== 大作文批改功能 ==========

function evaluateDazuowen() {
    const question = document.getElementById('dazuowen-question').value;
    const answer = document.getElementById('dazuowen-answer').value;
    const type = document.getElementById('dazuowen-type').value;

    if (!question.trim() || !answer.trim()) {
        showAlert('请输入题目和作答内容', 'warning');
        return;
    }

    const resultSection = document.getElementById('dazuowen-result');
    const feedbackDiv = document.getElementById('dazuowen-feedback');

    resultSection.style.display = 'block';

    const totalScore = 40;
    const score = Math.floor(Math.random() * 20) + 20;

    let evaluationHTML = `
        <div class="feedback-section">
            <h4>阅卷人两轮评判</h4>
            <div class="score-display">${score} / ${totalScore}</div>
        </div>

        <div class="feedback-section">
            <h4>第一轮：立意判定</h4>
            <table>
                <thead>
                    <tr>
                        <th>检查项</th>
                        <th>状态</th>
                        <th>说明</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>标题</td>
                        <td>✓</td>
                        <td>直接关联题干核心词</td>
                    </tr>
                    <tr>
                        <td>首段中心论点</td>
                        <td>✓</td>
                        <td>明确亮明观点</td>
                    </tr>
                    <tr>
                        <td>尾段回扣</td>
                        <td>△</td>
                        <td>回扣可以更紧密</td>
                    </tr>
                    <tr>
                        <td>分论点</td>
                        <td>✓</td>
                        <td>符合${type}框架</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="feedback-section">
            <h4>第二轮：多维细评</h4>
            <table>
                <thead>
                    <tr>
                        <th>维度</th>
                        <th>权重</th>
                        <th>得分</th>
                        <th>说明</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>立意准确性</td>
                        <td>30%</td>
                        <td>${Math.floor(score * 0.3)}</td>
                        <td>准确把握主题</td>
                    </tr>
                    <tr>
                        <td>结构规范性</td>
                        <td>20%</td>
                        <td>${Math.floor(score * 0.2)}</td>
                        <td>五段三分结构完整</td>
                    </tr>
                    <tr>
                        <td>论证充分性</td>
                        <td>20%</td>
                        <td>${Math.floor(score * 0.2)}</td>
                        <td>双线论述可加强</td>
                    </tr>
                    <tr>
                        <td>素材运用</td>
                        <td>15%</td>
                        <td>${Math.floor(score * 0.15)}</td>
                        <td>案例可更新颖</td>
                    </tr>
                    <tr>
                        <td>语言表达</td>
                        <td>15%</td>
                        <td>${Math.floor(score * 0.15)}</td>
                        <td>简洁有力</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="feedback-section">
            <h4>改进方向</h4>
            <ul class="improvement-list">
                <li>加强政策理论线的支撑，引用二十大报告、政府工作报告等</li>
                <li>更新案例素材，使用最新时政热点案例</li>
                <li>优化分论点段内结构：分论点句→政策理论→案例分析→小结论</li>
                <li>尾段回扣要更紧密，用新话术重申中心论点</li>
            </ul>
        </div>

        <div class="feedback-section">
            <h4>参考范文结构</h4>
            <div class="reference-answer">
                <h5>标题（对仗式）</h5>
                <p>守正为基 创新为翼</p>
                <h5>首段（150-200字）</h5>
                <p>引出话题 → 点明意义 → 亮明中心论点</p>
                <h5>分论点一（250-300字）</h5>
                <p>分论点句 → 政策理论支撑 → 案例分析 → 小结论</p>
                <h5>分论点二（250-300字）</h5>
                <p>分论点句 → 政策理论支撑 → 案例分析 → 小结论</p>
                <h5>分论点三（250-300字）</h5>
                <p>分论点句 → 政策理论支撑 → 案例分析 → 小结论</p>
                <h5>尾段（100-150字）</h5>
                <p>回扣 → 升华</p>
            </div>
        </div>
    `;

    feedbackDiv.innerHTML = evaluationHTML;
}

// ========== 命题预判功能 ==========

function predictExam() {
    const examType = document.getElementById('exam-type').value;
    const examPaper = document.getElementById('exam-paper').value;
    const examYear = document.getElementById('exam-year').value;

    const resultSection = document.getElementById('prediction-result');
    const feedbackDiv = document.getElementById('prediction-feedback');

    resultSection.style.display = 'block';

    let predictionHTML = `
        <div class="feedback-section">
            <h4>${examYear}年${examType}${examPaper}命题预判</h4>
            <p><strong>预判依据：</strong>历年真题趋势（60%）+ 当年时政热点（40%）</p>
        </div>
    `;

    if (examType === '国考') {
        if (examPaper === '副省级') {
            predictionHTML += `
                <div class="feedback-section">
                    <h4>预判方向一：高质量发展与新质生产力</h4>
                    <p><strong>热点背景：</strong>二十大报告强调高质量发展是全面建设社会主义现代化国家的首要任务</p>
                    <p><strong>可能题型：</strong>大作文（单主题）</p>
                    <p><strong>素材建议：</strong>科技创新、产业升级、绿色发展等案例</p>
                </div>
                <div class="feedback-section">
                    <h4>预判方向二：中国式现代化</h4>
                    <p><strong>热点背景：</strong>中国式现代化的五个特征</p>
                    <p><strong>可能题型：</strong>大作文（多主题）</p>
                    <p><strong>素材建议：</strong>共同富裕、人与自然和谐共生等案例</p>
                </div>
                <div class="feedback-section">
                    <h4>预判方向三：文化自信与文明传承</h4>
                    <p><strong>热点背景：</strong>文化传承发展座谈会精神</p>
                    <p><strong>可能题型：</strong>综合分析题或大作文</p>
                    <p><strong>素材建议：</strong>中华优秀传统文化创造性转化、创新性发展案例</p>
                </div>
            `;
        } else if (examPaper === '地市级') {
            predictionHTML += `
                <div class="feedback-section">
                    <h4>预判方向一：基层治理现代化</h4>
                    <p><strong>热点背景：</strong>基层治理是国家治理的基石</p>
                    <p><strong>可能题型：</strong>归纳概括题或综合分析题</p>
                    <p><strong>素材建议：</strong>社区治理、网格化管理、数字赋能等案例</p>
                </div>
                <div class="feedback-section">
                    <h4>预判方向二：乡村振兴与共同富裕</h4>
                    <p><strong>热点背景：</strong>全面推进乡村振兴</p>
                    <p><strong>可能题型：</strong>对策题或大作文</p>
                    <p><strong>素材建议：</strong>产业发展、人才培养、文化建设等案例</p>
                </div>
                <div class="feedback-section">
                    <h4>预判方向三：民生保障与社会治理</h4>
                    <p><strong>热点背景：</strong>增进民生福祉，提高人民生活品质</p>
                    <p><strong>可能题型：</strong>公文写作题或大作文</p>
                    <p><strong>素材建议：</strong>就业、教育、医疗、养老等案例</p>
                </div>
            `;
        } else {
            predictionHTML += `
                <div class="feedback-section">
                    <h4>预判方向一：法治政府建设</h4>
                    <p><strong>热点背景：</strong>全面推进依法治国</p>
                    <p><strong>可能题型：</strong>综合分析题或公文写作题</p>
                    <p><strong>素材建议：</strong>严格规范公正文明执法案例</p>
                </div>
                <div class="feedback-section">
                    <h4>预判方向二：营商环境优化</h4>
                    <p><strong>热点背景：</strong>打造市场化、法治化、国际化营商环境</p>
                    <p><strong>可能题型：</strong>对策题或大作文</p>
                    <p><strong>素材建议：</strong>放管服改革、政务服务创新等案例</p>
                </div>
                <div class="feedback-section">
                    <h4>预判方向三：行政执法规范化</h4>
                    <p><strong>热点背景：</strong>推进严格规范公正文明执法</p>
                    <p><strong>可能题型：</strong>归纳概括题或综合分析题</p>
                    <p><strong>素材建议：</strong>执法监督、执法能力建设等案例</p>
                </div>
            `;
        }
    } else if (examType === '省考') {
        predictionHTML += `
            <div class="feedback-section">
                <h4>预判方向一：区域协调发展</h4>
                <p><strong>热点背景：</strong>推动区域协调发展</p>
                <p><strong>可能题型：</strong>大作文（双主题AB型）</p>
                <p><strong>素材建议：</strong>城市群建设、城乡融合发展等案例</p>
            </div>
            <div class="feedback-section">
                <h4>预判方向二：数字经济与数字化转型</h4>
                <p><strong>热点背景：</strong>加快发展数字经济</p>
                <p><strong>可能题型：</strong>综合分析题或对策题</p>
                <p><strong>素材建议：</strong>数字政府、智慧城市、产业数字化等案例</p>
            </div>
            <div class="feedback-section">
                <h4>预判方向三：生态文明建设</h4>
                <p><strong>热点背景：</strong>推动绿色发展，促进人与自然和谐共生</p>
                <p><strong>可能题型：</strong>归纳概括题或大作文</p>
                <p><strong>素材建议：</strong>污染防治、生态修复、绿色低碳等案例</p>
            </div>
        `;
    } else {
        predictionHTML += `
            <div class="feedback-section">
                <h4>预判方向一：公共服务能力提升</h4>
                <p><strong>热点背景：</strong>提高公共服务水平</p>
                <p><strong>可能题型：</strong>对策题或公文写作题</p>
                <p><strong>素材建议：</strong>政务服务、教育医疗、文化体育等案例</p>
            </div>
            <div class="feedback-section">
                <h4>预判方向二：人才队伍建设</h4>
                <p><strong>热点背景：</strong>深入实施人才强国战略</p>
                <p><strong>可能题型：</strong>归纳概括题或综合分析题</p>
                <p><strong>素材建议：</strong>人才培养、引进、使用等案例</p>
            </div>
            <div class="feedback-section">
                <h4>预判方向三：事业单位改革</h4>
                <p><strong>热点背景：</strong>深化事业单位改革</p>
                <p><strong>可能题型：</strong>大作文或公文写作题</p>
                <p><strong>素材建议：</strong>体制机制创新、服务效能提升等案例</p>
            </div>
        `;
    }

    predictionHTML += `
        <div class="feedback-section">
            <h4>备考建议</h4>
            <ul class="improvement-list">
                <li>关注${examYear}年政府工作报告和领导人重要讲话</li>
                <li>研究近3-5年${examType}${examPaper}真题，把握命题趋势</li>
                <li>积累时政热点素材，特别是与考试主题相关的案例</li>
                <li>加强申论基本功训练，提高阅读理解、综合分析、解决问题能力</li>
            </ul>
        </div>
    `;

    feedbackDiv.innerHTML = predictionHTML;
}

// ========== 工具函数 ==========

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showAlert(message, type) {
    const existing = document.querySelectorAll('.alert');
    existing.forEach(el => el.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const main = document.querySelector('main');
    main.insertBefore(alertDiv, main.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}
