import React, { useState, useEffect } from "react";
import { useStomp } from "../socket/StompProvider";

export default function EditorView() {
  const { connected, lastResult, sendAnalyze } = useStomp();
  const [code, setCode] = useState("// 여기에 코드를 붙여넣고 분석을 눌러보세요");
  const [language, setLanguage] = useState("auto");

  useEffect(() => {
    if (lastResult) {
      // 필요 시 별도 상태/리스트에 누적
      console.log("받은 분석 결과:", lastResult);
    }
  }, [lastResult]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-3 text-sm text-gray-600">
        STOMP 연결 상태:{" "}
        <span className={connected ? "text-green-600" : "text-red-600"}>
          {connected ? "connected" : "disconnected"}
        </span>
      </div>

      <textarea
        className="w-full h-60 border rounded p-3 font-mono text-sm"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className="mt-3 flex gap-2">
        <select
          className="border rounded px-2 py-1"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="auto">auto</option>
          <option value="js">JavaScript</option>
          <option value="py">Python</option>
          {/* 필요 언어 추가 */}
        </select>

        <button
          onClick={() => sendAnalyze({ code, language })}
          className="bg-emerald-600 text-white px-4 py-2 rounded"
        >
          분석 요청
        </button>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">실시간 결과</h2>
        <pre className="bg-gray-50 border rounded p-3 text-sm">
          {lastResult ? JSON.stringify(lastResult, null, 2) : "아직 결과 없음"}
        </pre>
      </div>
    </div>
  );
}
