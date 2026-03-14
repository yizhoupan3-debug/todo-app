/**
 * DateNLP — 中文自然语言日期/时间解析器
 * 
 * 从任意中文文本中提取日期和时间信息，返回结构化结果。
 * 支持：绝对日期、相对日期、星期、时段+时间、组合表达式。
 *
 * Usage:
 *   const result = DateNLP.parse('周日下午五点去超市');
 *   // → { date: '2026-03-15', time: '17:00', matched: '周日下午五点', cleaned: '去超市' }
 */
const DateNLP = (() => {
  // ── 中文数字映射 ──
  const CN_DIGITS = { '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

  /** 中文数字 → 阿拉伯数字（支持 1~99） */
  function cnToNum(s) {
    if (!s) return NaN;
    // 纯阿拉伯数字
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    s = s.trim();
    // 单字
    if (s.length === 1 && CN_DIGITS[s] !== undefined) return CN_DIGITS[s];
    // 十X / X十 / X十X / 十
    let result = 0;
    let tens = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '十') {
        tens = true;
        if (i === 0) result = 10; // 十X → 1X
        else result = result * 10;
      } else {
        const d = CN_DIGITS[c];
        if (d === undefined) return NaN;
        if (tens) { result += d; tens = false; }
        else result = d;
      }
    }
    return result || NaN;
  }

  // ── 星期映射 ──
  const WEEKDAY_MAP = {
    '日': 0, '天': 0, '天': 0,
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 0,
  };

  // ── 时段映射（小时偏移判断） ──
  function applyPeriod(period, hour) {
    switch (period) {
      case '凌晨': return hour; // 0-5
      case '早上': case '早晨': case '上午': return hour; // 6-11, already correct
      case '中午': return hour < 12 ? hour + 12 : hour; // noon → 12-13
      case '下午': return hour < 12 ? hour + 12 : hour;
      case '傍晚': return hour < 12 ? hour + 12 : hour;
      case '晚上': case '晚间': case '夜里': case '夜晚':
        return hour < 12 ? hour + 12 : hour;
      default: return hour;
    }
  }

  // ── 日期格式化 ──
  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function fmtTime(h, m) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // ── 星期几友好名 ──
  const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  /** 获取友好的日期描述 */
  function friendlyDate(dateStr, refDate) {
    const ref = new Date(refDate);
    const target = new Date(dateStr + 'T00:00:00');
    const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const diff = Math.round((target - refDay) / 86400000);
    const weekday = WEEKDAY_NAMES[target.getDay()];
    const m = target.getMonth() + 1;
    const d = target.getDate();

    if (diff === 0) return `今天 ${weekday}`;
    if (diff === 1) return `明天 ${weekday}`;
    if (diff === 2) return `后天 ${weekday}`;
    if (diff === -1) return `昨天 ${weekday}`;
    return `${m}月${d}日 ${weekday}`;
  }

  // ══════════════════════════════════════════
  //  主解析逻辑
  // ══════════════════════════════════════════

  /**
   * 解析文本中的日期/时间信息
   * @param {string} text - 原始文本
   * @param {Date} [refDate] - 参考日期（默认当前时间）
   * @returns {{ date: string|null, time: string|null, matched: string, cleaned: string, friendlyDate: string|null, friendlyTime: string|null } | null}
   */
  function parse(text, refDate) {
    if (!text || typeof text !== 'string') return null;
    refDate = refDate || new Date();

    let dateResult = null;  // Date object
    let timeH = null, timeM = null;
    let matchedParts = [];  // all matched substrings to be removed

    const original = text;
    let remaining = text;

    // ──────────── 1. TIME PATTERNS (parse first, remove from text) ────────────

    // Pattern: 24h format HH:MM
    const timeHHMM = /(\d{1,2})[:\uff1a](\d{2})/;
    // Pattern: 时段 + X点(Y分|半)?
    const timeCN = /(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|晚间|夜里|夜晚)?(\d{1,2}|[一二三四五六七八九十两]+)点(?:(\d{1,2}|[一二三四五六七八九十百]+)分|半|钟)?/;
    // Pattern: standalone period + HH:MM
    const timePeriodHHMM = /(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|晚间|夜里|夜晚)(\d{1,2})[:\uff1a](\d{2})/;

    // Try period + HH:MM first
    let m = remaining.match(timePeriodHHMM);
    if (m) {
      const period = m[1];
      let h = parseInt(m[2], 10);
      let min = parseInt(m[3], 10);
      h = applyPeriod(period, h);
      if (h >= 0 && h < 24 && min >= 0 && min < 60) {
        timeH = h; timeM = min;
        matchedParts.push(m[0]);
        remaining = remaining.replace(m[0], '\x00');
      }
    }

    // Try Chinese time pattern
    if (timeH === null) {
      m = remaining.match(timeCN);
      if (m) {
        const period = m[1] || null;
        let h = cnToNum(m[2]);
        let min = 0;
        if (m[0].includes('半')) {
          min = 30;
        } else if (m[3]) {
          min = cnToNum(m[3]);
        }
        if (!isNaN(h) && h >= 0 && h <= 24) {
          if (period) h = applyPeriod(period, h);
          else if (h <= 12 && !period) { /* ambiguous, keep as-is */ }
          if (h >= 0 && h < 24 && min >= 0 && min < 60) {
            timeH = h; timeM = min;
            matchedParts.push(m[0]);
            remaining = remaining.replace(m[0], '\x00');
          }
        }
      }
    }

    // Try plain HH:MM
    if (timeH === null) {
      m = remaining.match(timeHHMM);
      if (m) {
        const h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        if (h >= 0 && h < 24 && min >= 0 && min < 60) {
          timeH = h; timeM = min;
          matchedParts.push(m[0]);
          remaining = remaining.replace(m[0], '\x00');
        }
      }
    }

    // ──────────── 2. DATE PATTERNS ────────────

    // Pattern: YYYY-MM-DD or YYYY/MM/DD
    const isoDate = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/;
    // Pattern: YYYY年M月D日
    const fullCNDate = /(\d{4})年(\d{1,2})月(\d{1,2})[日号]/;
    // Pattern: M月D日/号
    const monthDay = /(\d{1,2}|[一二三四五六七八九十]+)月(\d{1,2}|[一二三四五六七八九十]+)[日号]/;
    // Pattern: 相对日期
    const relDay = /(大后天|大前天|后天|前天|明天|今天|昨天)/;
    // Pattern: (这|本|下|下下|上)(周|星期|礼拜)(日|天|一|二|三|四|五|六|七)
    const weekdayMod = /(这|本|下下|下|上)(?:个)?(周|星期|礼拜)(日|天|一|二|三|四|五|六|七)/;
    // Pattern: 周X / 星期X / 礼拜X (no modifier)
    const weekdayPlain = /(?:周|星期|礼拜)(日|天|一|二|三|四|五|六|七)/;
    // Pattern: N天后/前
    const nDays = /(\d+|[一二三四五六七八九十两]+)天(后|前|以后|以前|之后|之前)/;

    // Try ISO date
    m = remaining.match(isoDate);
    if (m) {
      dateResult = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      matchedParts.push(m[0]);
      remaining = remaining.replace(m[0], '\x00');
    }

    // Try full CN date YYYY年M月D日
    if (!dateResult) {
      m = remaining.match(fullCNDate);
      if (m) {
        dateResult = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
        matchedParts.push(m[0]);
        remaining = remaining.replace(m[0], '\x00');
      }
    }

    // Try M月D日
    if (!dateResult) {
      m = remaining.match(monthDay);
      if (m) {
        const month = cnToNum(m[1]);
        const day = cnToNum(m[2]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const year = refDate.getFullYear();
          dateResult = new Date(year, month - 1, day);
          // 如果这个日期已经过了，考虑是否指明年
          // 月日都过了且差距超过7天，可能是明年
          const diff = dateResult - new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
          if (diff < -7 * 86400000) {
            dateResult = new Date(year + 1, month - 1, day);
          }
          matchedParts.push(m[0]);
          remaining = remaining.replace(m[0], '\x00');
        }
      }
    }

    // Try 相对日期
    if (!dateResult) {
      m = remaining.match(relDay);
      if (m) {
        const d = new Date(refDate);
        d.setHours(0, 0, 0, 0);
        const offsets = { '大前天': -3, '前天': -2, '昨天': -1, '今天': 0, '明天': 1, '后天': 2, '大后天': 3 };
        d.setDate(d.getDate() + offsets[m[1]]);
        dateResult = d;
        matchedParts.push(m[0]);
        remaining = remaining.replace(m[0], '\x00');
      }
    }

    // Try weekday with modifier (下周一, 上周三, 这周五, 下下周一)
    if (!dateResult) {
      m = remaining.match(weekdayMod);
      if (m) {
        const modifier = m[1]; // 这/本/下/下下/上
        const dayName = m[3];
        const targetDay = WEEKDAY_MAP[dayName];
        if (targetDay !== undefined) {
          const d = new Date(refDate);
          d.setHours(0, 0, 0, 0);
          const currentDay = d.getDay(); // 0=Sun, 6=Sat

          if (modifier === '这' || modifier === '本') {
            // 本周的目标星期几（可能是过去，也可能是未来）
            const diff = targetDay - currentDay;
            d.setDate(d.getDate() + diff);
          } else if (modifier === '下') {
            // 下周的目标星期几
            const daysUntilNextWeekTarget = (targetDay - currentDay + 7) % 7 || 7;
            // 确保至少跳到下周
            let offset = daysUntilNextWeekTarget;
            if (offset <= (6 - currentDay)) offset += 7; // 如果还在本周就再加 7
            // 简化：下周 = 下个以周一为起点的周
            const daysUntilNextMonday = (1 - currentDay + 7) % 7 || 7;
            offset = daysUntilNextMonday + (targetDay === 0 ? 6 : targetDay - 1);
            d.setDate(d.getDate() + offset);
          } else if (modifier === '下下') {
            // 下下周
            const daysUntilNextMonday = (1 - currentDay + 7) % 7 || 7;
            const offset = daysUntilNextMonday + 7 + (targetDay === 0 ? 6 : targetDay - 1);
            d.setDate(d.getDate() + offset);
          } else if (modifier === '上') {
            // 上周
            const daysToLastMonday = (currentDay === 0 ? 6 : currentDay - 1) + 7;
            const lastMonday = new Date(d);
            lastMonday.setDate(d.getDate() - daysToLastMonday);
            const offset = targetDay === 0 ? 6 : targetDay - 1;
            d.setTime(lastMonday.getTime());
            d.setDate(d.getDate() + offset);
          }
          dateResult = d;
          matchedParts.push(m[0]);
          remaining = remaining.replace(m[0], '\x00');
        }
      }
    }

    // Try plain weekday (周日, 星期一)
    if (!dateResult) {
      m = remaining.match(weekdayPlain);
      if (m) {
        const dayName = m[1];
        const targetDay = WEEKDAY_MAP[dayName];
        if (targetDay !== undefined) {
          const d = new Date(refDate);
          d.setHours(0, 0, 0, 0);
          const currentDay = d.getDay();
          // 向未来找最近的目标星期几
          let diff = (targetDay - currentDay + 7) % 7;
          if (diff === 0) diff = 0;  // 今天就是 → 指今天
          d.setDate(d.getDate() + diff);
          dateResult = d;
          matchedParts.push(m[0]);
          remaining = remaining.replace(m[0], '\x00');
        }
      }
    }

    // Try N天后/前
    if (!dateResult) {
      m = remaining.match(nDays);
      if (m) {
        const n = cnToNum(m[1]);
        const direction = m[2].includes('前') ? -1 : 1;
        if (!isNaN(n) && n > 0 && n <= 365) {
          const d = new Date(refDate);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + n * direction);
          dateResult = d;
          matchedParts.push(m[0]);
          remaining = remaining.replace(m[0], '\x00');
        }
      }
    }

    // ──────────── 3. BUILD RESULT ────────────

    if (!dateResult && timeH === null) return null;

    // If we only have time but no date, default to today
    const dateStr = dateResult ? fmtDate(dateResult) : null;
    const timeStr = timeH !== null ? fmtTime(timeH, timeM !== null ? timeM : 0) : null;

    // Build matched string (in original order, joined)
    const allMatched = matchedParts.join('');

    // Build cleaned text: remove matched parts and clean up whitespace
    let cleaned = original;
    for (const part of matchedParts) {
      cleaned = cleaned.replace(part, '');
    }
    // Clean up leftover spaces and punctuation at boundaries
    cleaned = cleaned.replace(/^\s+/, '').replace(/\s+$/, '').replace(/\s{2,}/g, ' ');

    // Build friendly display strings
    const friendly = dateStr ? friendlyDate(dateStr, refDate) : '今天';
    const friendlyT = timeStr || null;

    return {
      date: dateStr,
      time: timeStr,
      matched: allMatched,
      cleaned: cleaned,
      friendlyDate: friendly,
      friendlyTime: friendlyT,
    };
  }

  // Public API
  return { parse, cnToNum };
})();
