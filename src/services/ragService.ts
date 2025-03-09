export const augmentQueryWithDocuments = (
    query: string,
    documents: Array<[number, { title: string; content: string }]>
): { augmentedQuery: string; docReferences: { title: string; similarity: number }[] } => {
    const relevantDocsText: string[] = [];
    const docReferences: { title: string; similarity: number }[] = [];

    documents.forEach(([similarity, doc]) => {
        relevantDocsText.push(`${doc.title}: ${doc.content}`);
        docReferences.push({
            title: doc.title,
            similarity: parseFloat(similarity.toFixed(4)),
        });
    });

    const relevantDocsStr = relevantDocsText.join("\n");
    const augmentedQuery = `Based on the following documents:\n${relevantDocsStr}\n\nAnswer the question: ${query}`;

    return { augmentedQuery, docReferences };
};