import http from "http";

const req = http.request(
  "http://localhost:3000/api/chat",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Response:", data);
    });
  }
);

req.on("error", (e) => {
  console.error(e);
});

req.write(JSON.stringify({ message: "hi" }));
req.end();
