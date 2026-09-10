import React, { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Bot } from "lucide-react";

const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });
const fmtDate = (ts) => new Date(ts).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

function answer({ currentUser, myTx, myLoans }, question) {
  const q = question.toLowerCase();

  if (/(saving|balance)/.test(q)) {
    return `Your current savings balance is ${naira(currentUser.balance)}.`;
  }

  if (/(next|due).*(repay|loan)|repayment.*due/.test(q)) {
    const loan = myLoans.find((l) => ["disbursed", "repaying"].includes(l.status));
    if (!loan) return "You don't have an active loan right now, so there's no repayment due.";
    return `Your next repayment on your ₦${Number(loan.amount).toLocaleString("en-NG")} loan is ${naira(loan.monthlyPayment)}. You've repaid ${naira(loan.paid || 0)} so far.`;
  }

  if (/(contribution|deposit).*(go through|confirm|received|successful)/.test(q)) {
    const last = [...myTx].filter((t) => t.type === "deposit").sort((a, b) => b.ts - a.ts)[0];
    if (!last) return "I don't see any contributions on your account yet.";
    return `Yes — your last contribution of ${naira(last.amount)} on ${fmtDate(last.ts)} was recorded successfully.`;
  }

  if (/(recent|last).*(transaction)|transaction history|statement/.test(q)) {
    const recent = myTx.slice(0, 3);
    if (!recent.length) return "You don't have any transactions yet.";
    return "Here are your most recent transactions:\n" + recent.map((t) => `• ${t.type === "deposit" ? "Deposit" : "Withdrawal"} of ${naira(t.amount)} on ${fmtDate(t.ts)}`).join("\n");
  }

  if (/loan/.test(q)) {
    const loan = myLoans[0];
    if (!loan) return "You don't have any loan applications on record.";
    return `Your most recent loan application is for ${naira(loan.amount)} (${loan.purpose}), currently "${loan.status.replace("_", " ")}".`;
  }

  return "I can help with things like your savings balance, next loan repayment, whether a contribution went through, or your recent transactions — try asking one of those.";
}

const SUGGESTIONS = [
  "How much have I saved?",
  "When is my next loan repayment?",
  "Did my contribution go through?",
  "Show my recent transactions.",
];

export default function AskCoopGuard({ currentUser, myTx, myLoans }) {
  const [messages, setMessages] = useState([
    { from: "bot", text: `Hi ${currentUser.name.split(" ")[0]}, I'm Coop Guard. Ask me about your savings, contributions, or loans.` },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = (text) => {
    const question = (text ?? input).trim();
    if (!question) return;
    const reply = answer({ currentUser, myTx, myLoans }, question);
    setMessages((prev) => [...prev, { from: "user", text: question }, { from: "bot", text: reply }]);
    setInput("");
  };

  return (
    <div className="cg-page">
      <div className="cg-page-head">
        <div className="cg-eyebrow">Member AI Assistant</div>
        <h2><MessageSquare size={18} /> Ask Coop Guard</h2>
        <p className="cg-page-desc">Simulated assistant, answering from your own account data.</p>
      </div>

      <div className="cg-ask-wrap">
        <div className="cg-ask-log">
          {messages.map((m, i) => (
            <div key={i} className={`cg-ask-bubble cg-ask-${m.from}`}>
              {m.from === "bot" && <Bot size={14} />}
              <span style={{ whiteSpace: "pre-line" }}>{m.text}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="cg-ask-suggestions">
          {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
        </div>

        <form className="cg-ask-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your savings, loans, or transactions…" />
          <button type="submit"><Send size={15} /></button>
        </form>
      </div>
    </div>
  );
}
