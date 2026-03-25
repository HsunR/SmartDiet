from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

loader = TextLoader("中国饮食500忌_修复.txt", encoding="utf-8")
docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
all_splits = text_splitter.split_documents(docs)

print(f"Loaded {len(docs)} documents, split into {len(all_splits)} chunks\n")

embeddings = OpenAIEmbeddings(
    model="text-embedding-qwen3-embedding-0.6b",
    base_url="http://127.0.0.1:1234/v1",
    api_key="lm-studio",
    check_embedding_ctx_length=False,
)

vector_store = Chroma(
    collection_name="example_collection",
    embedding_function=embeddings,
    persist_directory="./chroma_langchain_db",
)

# ids = vector_store.add_documents(documents=all_splits)
# print(f"Added {len(ids)} documents to vector store")

results = vector_store.similarity_search_with_score("米饭煮着吃")

score, doc = results[0]

print(f"Score: {score}\n")
print(doc)