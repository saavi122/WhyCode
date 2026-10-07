import axios from "axios";

async function inspectQdrant() {
  const collectionsRes = await axios.get("http://localhost:6333/collections");
  console.log("Qdrant Collections:", collectionsRes.data);

  for (const c of collectionsRes.data.result.collections) {
    const info = await axios.get(`http://localhost:6333/collections/${c.name}`);
    console.log(`Collection ${c.name} info:`, info.data.result);
  }
}

inspectQdrant().catch(console.error);
