import axios from "axios";

async function inspectPoints() {
  const scrollRes = await axios.post("http://localhost:6333/collections/repository_chunks/points/scroll", {
    limit: 50,
    with_payload: true,
  });

  const points = scrollRes.data.result.points;
  console.log(`Retrieved ${points.length} sample points:`);
  const repos = new Set();
  const companies = new Set();
  const docTypes = new Set();
  const filePaths = new Set();

  for (const p of points) {
    repos.add(p.payload?.repositoryId);
    companies.add(p.payload?.companyId);
    docTypes.add(p.payload?.documentType);
    if (p.payload?.filePath) filePaths.add(p.payload?.filePath);
  }

  console.log("Repositories in Qdrant:", Array.from(repos));
  console.log("Companies in Qdrant:", Array.from(companies));
  console.log("Document Types in Qdrant:", Array.from(docTypes));
  console.log("Sample file paths:", Array.from(filePaths).slice(0, 20));
}

inspectPoints().catch(console.error);
