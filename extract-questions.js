const { Poppler } = require('node-poppler');
const fs = require('fs');
const path = require('path');

const poppler = new Poppler();
const ZHENTI_BASE = 'D:/zhenti';

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

function extractQuestionSection(text) {
    // Find last "作答要求"
    let lastIdx = -1, searchFrom = 0;
    while (true) {
        const idx = text.indexOf('作答要求', searchFrom);
        if (idx === -1) break;
        lastIdx = idx;
        searchFrom = idx + 1;
    }
    if (lastIdx < 0) return null;

    let section = text.substring(lastIdx);
    // Remove answer sections
    const answerMarkers = ['参考答案', '答案解析', '【解析】'];
    let minIdx = section.length;
    for (const am of answerMarkers) {
        const idx = section.indexOf(am);
        if (idx > 200 && idx < minIdx) minIdx = idx;
    }
    if (minIdx < section.length) section = section.substring(0, minIdx);
    return section;
}

function parseQuestions(qSection) {
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
            .trim();

        if (content.length < 20) continue;

        const scoreMatch = content.match(/(\d+)\s*分/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 15;

        if (content.includes('写一篇文章') || content.includes('写一篇议论') ||
            (content.includes('自拟题目') && (content.includes('1000') || content.includes('800') || content.includes('1200')))) {
            dazuowen = { id, score: score || 40, topicType: '单主题', content };
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
            xiaoti.push({ id, type, score, content });
        }
        id++;
    }

    if (xiaoti.length === 0 && !dazuowen) return null;
    return { xiaoti, dazuowen };
}

function findPDFFile(dir, year) {
    try {
        const files = fs.readdirSync(dir);
        const yearStr = String(year);
        let matches = files.filter(f => f.endsWith('.pdf') && f.includes(yearStr));
        if (matches.length === 0) return null;
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
            const pdfPath = findPDFFile(PDF_PATHS['国考'], exam.year);
            if (!pdfPath) { console.log('NO FILE'); fail++; continue; }
            const text = await extractTextWithTimeout(pdfPath);
            if (!text) { console.log('EXTRACT FAIL'); fail++; continue; }
            const qSection = extractQuestionSection(text);
            const result = parseQuestions(qSection);
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
            const qSection = extractQuestionSection(text);
            const result = parseQuestions(qSection);
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
