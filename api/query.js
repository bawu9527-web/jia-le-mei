export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { address } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `你是台灣專業房地產分析師，專精於桃園、中壢及大台北地區不動產市場。

用戶查詢：${address}

請針對上述地址或建案，提供詳細的買賣行情、租賃行情及周邊資訊分析。

YOUR ENTIRE RESPONSE MUST BE A SINGLE VALID JSON OBJECT. DO NOT OUTPUT ANYTHING OTHER THAN JSON. DO NOT INCLUDE BACKTICKS OR MARKDOWN.

JSON格式：
{"address_summary":"地址摘要","district":"行政區","analysis_date":"2025年4月","buy_sell":{"average_unit_price":"XX萬/坪","price_range":"XX~XX萬/坪","total_price_range":"XXX~XXX萬","recent_transactions":[{"type":"住宅大樓","size":"30坪","floor":"中層","unit_price":"XX萬","total_price":"XXX萬","date":"2024年Q4","note":""},{"type":"住宅大樓","size":"25坪","floor":"高層","unit_price":"XX萬","total_price":"XXX萬","date":"2025年Q1","note":""}],"trend":"price_up","trend_text":"趨勢說明一句話","market_comment":"市場評語2~3句"},"rental":{"average_monthly_rent":"XX,XXX元","rent_range":"XX,XXX~XX,XXX元","rent_per_ping":"XXX元/坪","recent_rentals":[{"type":"2房","size":"28坪","floor":"中層","monthly_rent":"XX,XXX元","date":"2025年Q1","note":""},{"type":"套房","size":"10坪","floor":"低層","monthly_rent":"X,XXX元","date":"2024年Q4","note":""}],"vacancy_rate":"低空置率","rental_yield":"X.X%","market_comment":"租賃市場評語2~3句"},"nearby_info":{"transportation":["交通1","交通2","交通3"],"schools":["學校1","學校2"],"commercial":["商業1","商業2","商業3"],"development":"區域發展說明2~3句"},"investment_advice":"投資建議3~5句","data_source_note":"本報告為AI依據知識庫估算，數據僅供參考，實際成交價請至內政部實價登錄平台查詢核實。"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 3000 },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/gi, '').trim();
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
    if (s === -1 || e === -1) throw new Error('AI回應格式錯誤');
    const result = JSON.parse(clean.slice(s, e + 1));

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
