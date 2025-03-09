# AI Agent Backend in Typescript

## Steps
1. Make a config/config.ts file and put your key on it. (refer to the sample.config.ts)
2. (optional). Put the GloVe embeddings in the "pretrain-embeddings" folder if you chooes another GloVe pre-train word vectors as embedding service. Download embeddings from [here](https://nlp.stanford.edu/projects/glove/).
3. (optional). Modify the intent schema in config/intent_schema if needed.
4. Use ```docker-compose up --build``` to start the server.

## Commands
- ```docker-compose up --build```: start the server
- ```docker-compose logs -f web```: track the log
