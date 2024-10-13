import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      console.log(result.textractData);
      setMessage(result.message);
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage("File upload failed");
    }
  };

  return (
    <div>
      <h1>Upload a Document</h1>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Upload File</button>
      </form>
      <p>{message}</p>
    </div>
  );
}

export default App;