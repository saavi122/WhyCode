import axios from "axios";

async function listRepoFiles() {
  const scrollRes = await axios.post("http://localhost:6333/collections/repository_chunks/points/scroll", {
    limit: 200,
    with_payload: true,
    filter: {
      must: [
        { key: "companyId", match: { value: "6ac109ecc9b4a76a9ca591f2" } },
        { key: "repositoryId", match: { value: "6ac19a3fbb1ce57fae1480a7" } },
      ],
    },
  });

  const points = scrollRes.data.result.points;
  const paths = new Map();
  for (const p of points) {
    const path = p.payload?.filePath || p.payload?.path;
    const docType = p.payload?.documentType || "CODE";
    if (path) {
      if (!paths.has(path)) paths.set(path, { count: 0, docType, sample: p.payload?.content || p.payload?.text });
      paths.get(path).count++;
    }
  }

  console.log(`Found ${paths.size} unique paths in Qdrant:`);
  for (const [pth, meta] of paths.entries()) {
    console.log(`- ${pth} (${meta.docType}, ${meta.count} chunks)`);
  }
}

listRepoFiles().catch(console.error);
