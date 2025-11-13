import { useState } from "react";
import { testDB } from "../firebase";

function App() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setError(null);
    try {
      const data = await testDB();
      setResult(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error desconegut");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Test React + Firebase</h1>

      <button onClick={handleTest} style={{ padding: "10px 20px", fontSize: "16px" }}>
        Provar connexio Firestore
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>
          Error: {error}
        </p>
      )}

      {result && (
        <pre
          style={{
            marginTop: "20px",
            background: "#eee",
            padding: "20px",
            borderRadius: "5px",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default App;
