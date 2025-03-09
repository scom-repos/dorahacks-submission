import fs from "fs";
import readline from "readline";
import { gloveEmbeddings } from "../utils/gloveStorage";

export interface Embeddings {
    [word: string]: number[];
}

/**
 * Loads GloVe embeddings from a file into memory, processing line by line.
 * @param filePath Path to the GloVe embeddings file.
 * @returns A promise that resolves to an object mapping words to their embeddings.
 */
export async function loadGloveEmbeddings(filePath: string): Promise<Embeddings> {
    const embeddings: Embeddings = {};

    const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    console.log("Loading GloVe embeddings...");
    for await (const line of rl) {
        const parts = line.trim().split(" ");
        const word = parts[0];
        const vector = parts.slice(1).map(Number);

        if (word && vector.length > 0) {
            embeddings[word] = vector;
        }
    }

    console.log("GloVe embeddings loaded.");
    return embeddings;
}

/**
 * Retrieves the embedding for a specific word from the loaded embeddings.
 * @param word The word to retrieve the embedding for.
 * @param embeddings The loaded GloVe embeddings.
 * @returns The embedding vector or null if the word is not found.
 */
export function getWordEmbedding(word: string): number[] | null {
    if (!gloveEmbeddings) {
        throw new Error("GloVe embeddings have not been loaded.");
    } else {
        return gloveEmbeddings[word] || null;
    }

}

// Compute the Levenshtein distance between two strings.
function levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
        new Array(n + 1).fill(0)
    );

    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],    // deletion
                    dp[i][j - 1],    // insertion
                    dp[i - 1][j - 1] // substitution
                );
            }
        }
    }

    return dp[m][n];
}

// Given a word and the vocabulary, find the closest match using Levenshtein distance.
function findClosestWord(
    word: string,
    vocabulary: string[]
): string | null {
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    // Define a threshold based on the word length.
    // Adjust the threshold as needed for your application.
    const threshold = word.length <= 5 ? 2 : 3;

    for (const candidate of vocabulary) {
        const distance = levenshteinDistance(word, candidate);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = candidate;
        }
    }

    return bestDistance <= threshold ? bestMatch : null;
}

// Utility function to clean a word by stripping leading/trailing punctuation.
function cleanWord(word: string): string {
    // This regex removes non-word characters (anything other than letters, digits, or underscore)
    // from the beginning and end of the string.
    return word.replace(/^\W+|\W+$/g, '');
}

export function getTextEmbedding(text: string): number[] {
    // Split the text into words.
    const rawWords = text.split(/\s+/);

    // Convert to lowercase and clean each word.
    const words = rawWords.map(word => cleanWord(word.toLowerCase())).filter(Boolean);

    if (!gloveEmbeddings) {
        throw new Error("GloVe embeddings have not been loaded.");
    }

    // Precompute vocabulary keys for fuzzy matching.
    const vocabulary = Object.keys(gloveEmbeddings);

    // Map each cleaned word to its vector.
    const vectors = words.map((word) => {
        if (gloveEmbeddings![word]) {
            return gloveEmbeddings![word];
        } else {
            const closest = findClosestWord(word, vocabulary);
            if (closest) {
                console.log(`Can't find word "${word}", using "${closest}" instead`);
                return gloveEmbeddings![closest];
            } else {
                console.log(`Can't find word "${word}" and no close match found`);
                return null;
            }
        }
    }).filter(Boolean) as number[][]; // Remove any null values

    if (vectors.length === 0) {
        throw new Error("No embeddings found for the given text.");
    }

    // Average the vectors.
    const dimension = vectors[0].length;
    const avgEmbedding = new Array(dimension).fill(0);
    vectors.forEach((vector) => {
        for (let i = 0; i < dimension; i++) {
            avgEmbedding[i] += vector[i];
        }
    });

    return avgEmbedding.map(val => val / vectors.length);
}



// export function getTextEmbedding(text: string): number[] {
//     const words = text.split(/\s+/).map((word) => word.toLowerCase());
//     if (!gloveEmbeddings) {
//         throw new Error("GloVe embeddings have not been loaded.");
//     }
//     const vectors = words.map((word) => gloveEmbeddings![word]).filter(Boolean);

//     if (vectors.length === 0) {
//         throw new Error("No embeddings found for the given text.");
//     }

//     const dimension = vectors[0].length;
//     const avgEmbedding = new Array(dimension).fill(0);

//     vectors.forEach((vector) => {
//         for (let i = 0; i < dimension; i++) {
//             avgEmbedding[i] += vector[i];
//         }
//     });

//     return avgEmbedding.map((val) => val / vectors.length);
// }
