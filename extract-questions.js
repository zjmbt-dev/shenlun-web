const { Poppler } = require('node-poppler');
const fs = require('fs');
const path = require('path');

const poppler = new Poppler();
const ZHENTI_BASE = path.join(__dirname, 'zhenti');

const PDF_PATHS = {
    '国考': `${ZHENTI_BASE}/2010-2024国考申论PDF`,
    '广东': `${ZHENTI_BASE}/【05】广东公务员考试真题pdf版/广东公务员考试真题——申论03-24`,
    '江西': `${ZHENTI_BASE}/【16】江西公务员考试真题pdf版/江西公务员考试真题——申论06-24PDF版`,
    '浙江': `${ZHENTI_BASE}/【30】浙江公务员考试真题pdf版/浙江公务员考试真题——申论04-24【缺22】`,
};

function extractTextWithTimeout(pdfPath, timeoutMs = 20000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        poppler.pdfToText(pdfPath)
            .then(res => { clearTimeout(timer); resolve(String(res)); })
            .catch(() => { clearTimeout(timer); resolve(null); });
    });
}

// 清理文本内容
function cleanText(text) {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/第\s*\d+\s*页\s*共\s*\d+\s*页/g, '')
        .replace(/关注.*?获取持续更新/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// 提取给定材料部分
function extractMaterials(text) {
    const materials = {};
    // 匹配多种格式："材料 1："、"给定资料 1"、"资料 1："
    const materialRegex = /(?:材料|给定资料|资料)\s*(\d+)[：:\s]?/g;
    const matches = [];
    let match;

    while ((match = materialRegex.exec(text)) !== null) {
        const id = parseInt(match[1]);
        // 避免重复（给定资料可能匹配两次）
        if (!matches.find(m => m.id === id && Math.abs(m.index - match.index) < 100)) {
            matches.push({ id, index: match.index });
        }
    }

    // 按位置排序
    matches.sort((a, b) => a.index - b.index);

    // 提取每个材料的内容
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
        let content = text.substring(start, end);

        // 去掉开头的标记
        content = content.replace(/^(?:材料|给定资料|资料)\s*\d+[：:\s]?\s*/, '');
        // 去掉页码
        content = content.replace(/\d+\s*$/, '').trim();

        materials[matches[i].id] = cleanText(content);
    }

    return materials;
}

// 提取作答要求部分
function extractQuestionSection(text) {
    const markers = ['作答要求'];
    for (const marker of markers) {
        let lastIdx = -1, searchFrom = 0;
        while (true) {
            const idx = text.indexOf(marker, searchFrom);
            if (idx === -1) break;
            lastIdx = idx;
            searchFrom = idx + 1;
        }
        if (lastIdx >= 0) {
            let section = text.substring(lastIdx);
            // 去掉答案部分
            const answerMarkers = ['参考答案', '答案解析', '【解析】'];
            let minIdx = section.length;
            for (const am of answerMarkers) {
                const idx = section.indexOf(am);
                if (idx > 200 && idx < minIdx) minIdx = idx;
            }
            if (minIdx < section.length) section = section.substring(0, minIdx);
            return section;
        }
    }
    return null;
}

// 解析题目
function parseQuestions(qSection, materials) {
    if (!qSection) return null;

    const splitRegex = /(?=第[一二三四五六七八九十]+\s*题[:：]?\s*|^[一二三四五六七八九十]+[、.]\s*|^[（(][一二三四五六七八九十]+[）)]\s*|^[0-9]+[.、]\s*|^问题[一二三四五六七八九十]+\s*[:：]?\s*)/m;
    const parts = qSection.split(splitRegex);

    const xiaoti = [];
    let dazuowen = null, id = 1;

    for (const part of parts.slice(0, 12)) {
        let trimmed = part.trim();
        if (trimmed.length < 20) continue;
        if (/^二[、.]作答/.test(trimmed)) continue;
        if (/^一[、.]给定/.test(trimmed)) continue;
        if (/^作答要求\s*$/.test(trimmed)) continue;
        if (/^参考答案/.test(trimmed)) continue;

        const content = trimmed
            .replace(/^第[一二三四五六七八九十]+\s*题[:：]?\s*/, '')
            .replace(/^[一二三四五六七八九十]+[、.]\s*/, '')
            .replace(/^[（(][一二三四五六七八九十]+[）)]\s*/, '')
            .replace(/^[0-9]+[.、]\s*/, '')
            .replace(/^问题[一二三四五六七八九十]+\s*[:：]?\s*/, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '')
            .replace(/第\s*\d+\s*页\s*共\s*\d+\s*页/g, '')
            .replace(/关注.*?获取持续更新/g, '')
            .replace(/\s+\d+\s*$/, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/([^\n])\n([^\n])/g, (match, p1, p2) => {
                if (p2.startsWith('要') || p1.endsWith('）')) return match;
                return p1 + p2;
            })
            .trim();

        if (content.length < 20) continue;

        // 查找题目引用的材料
        let materialIds = [];
        const materialRefRegex = /给定材料\s*(\d+)|给定资料\s*(\d+)|材料\s*(\d+)|资料\s*(\d+)/g;
        let refMatch;
        while ((refMatch = materialRefRegex.exec(content)) !== null) {
            const mid = parseInt(refMatch[1] || refMatch[2] || refMatch[3] || refMatch[4]);
            if (!materialIds.includes(mid)) materialIds.push(mid);
        }

        // 构建完整题目内容（题目 + 材料）
        let fullContent = content + '\n';
        if (materialIds.length > 0 && materials) {
            // 按顺序添加引用的材料
            materialIds.sort((a, b) => a - b);
            materialIds.forEach(mid => {
                if (materials[mid]) {
                    fullContent += `\n【材料${mid}】\n${materials[mid]}\n`;
                }
            });
        }

        const scoreMatch = content.match(/(\d+)\s*分/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 15;

        if (content.includes('写一篇文章') || content.includes('写一篇议论') ||
            (content.includes('自拟题目') && (content.includes('1000') || content.includes('800') || content.includes('1200')))) {
            dazuowen = { id, score: score || 40, topicType: '单主题', content: fullContent };
        } else {
            let type = '归纳概括题';
            if (content.includes('谈谈') || content.includes('理解') || content.includes('看法') ||
                content.includes('分析') || content.includes('启示') || content.includes('原因')) {
                type = '综合分析题';
            }
            if (content.includes('撰写') || content.includes('草拟') || content.includes('简报') ||
                content.includes('报告') || content.includes('方案') || content.includes('建议书') ||
                content.includes('讲话稿') || content.includes('倡议书') || content.includes('汇报') ||
                content.includes('发言稿') || content.includes('通报') || content.includes('工作方案')) {
                type = '公文写作题';
            }
            xiaoti.push({ id, type, score, content: fullContent });
        }
        id++;
    }

    if (xiaoti.length === 0 && !dazuowen) return null;
    return { xiaoti, dazuowen };
}

function findPDFFile(dir, year, paperType) {
    try {
        const files = fs.readdirSync(dir);
        const yearStr = String(year);
        let matches = files.filter(f => f.endsWith('.pdf') && f.includes(yearStr));
        if (matches.length === 0) return null;

        if (paperType) {
            const typeMatches = matches.filter(f => f.includes(paperType));
            if (typeMatches.length > 0) matches = typeMatches;
        }

        const questionFile = matches.find(f => (f.includes('试题') || f.includes('完整版')) && !f.includes('答案'));
        if (questionFile) return path.join(dir, questionFile);
        const anyQuestionFile = matches.find(f => f.includes('题'));
        if (anyQuestionFile) return path.join(dir, anyQuestionFile);
        return path.join(dir, matches[0]);
    } catch (e) { return null; }
}

async function main() {
    const questions = { '国考': { '副省级': {}, '地市级': {}, '行政执法': {} } };
    const index = JSON.parse(fs.readFileSync('exams-index.json', 'utf-8'));
    let ok = 0, fail = 0;

    // 国考
    for (const pt of ['副省级', '地市级', '行政执法']) {
        for (const exam of index['国考'][pt]) {
            process.stdout.write(`国考 ${pt} ${exam.year}... `);
            const pdfPath = findPDFFile(PDF_PATHS['国考'], exam.year, pt);
            if (!pdfPath) { console.log('NO FILE'); fail++; continue; }
            const text = await extractTextWithTimeout(pdfPath);
            if (!text) { console.log('EXTRACT FAIL'); fail++; continue; }
            // 只在作答要求之前提取材料
            const qIdx = text.lastIndexOf('作答要求');
            const materialText = qIdx > 0 ? text.substring(0, qIdx) : text;
            const materials = extractMaterials(materialText);
            const qSection = extractQuestionSection(text);
            const result = parseQuestions(qSection, materials);
            if (result) {
                questions['国考'][pt][exam.year] = result;
                ok++;
                console.log(`OK (${result.xiaoti.length}题)`);
            } else {
                fail++;
                console.log('PARSE FAIL');
            }
        }
    }

    // 省考
    for (const province of ['浙江', '江西', '广东']) {
        questions[province] = {};
        for (const exam of index[province]) {
            const note = exam.note || '通用卷';
            process.stdout.write(`${province} ${exam.year} ${note}... `);
            const pdfPath = path.join(PDF_PATHS[province], exam.file);
            if (!fs.existsSync(pdfPath)) { console.log('NO FILE'); fail++; continue; }
            const text = await extractTextWithTimeout(pdfPath);
            if (!text) { console.log('EXTRACT FAIL'); fail++; continue; }
            // 只在作答要求之前提取材料
            const qIdx = text.lastIndexOf('作答要求');
            const materialText = qIdx > 0 ? text.substring(0, qIdx) : text;
            const materials = extractMaterials(materialText);
            const qSection = extractQuestionSection(text);
            const result = parseQuestions(qSection, materials);
            if (result) {
                if (!questions[province][note]) questions[province][note] = {};
                questions[province][note][exam.year] = result;
                ok++;
                console.log(`OK (${result.xiaoti.length}题)`);
            } else {
                fail++;
                console.log('PARSE FAIL');
            }
        }
    }

    console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
    fs.writeFileSync('exam-questions.json', JSON.stringify(questions, null, 2), 'utf-8');
    console.log('已保存到 exam-questions.json');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
