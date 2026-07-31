import os
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
# Add this right above Step A:
movie_data = [
    {
        "title": "Interstellar",
        "genre": "Sci-Fi",
        "year": 2014,
        "director": "Christopher Nolan",
        "plot": "When Earth becomes uninhabitable, a team of ex-NASA pilots travels through a wormhole near Saturn to find a new home for humanity."
    },
    {
        "title": "Blade Runner 2049",
        "genre": "Sci-Fi",
        "year": 2017,
        "director": "Denis Villeneuve",
        "plot": "Young Blade Runner K uncovers a long-buried secret that leads him to track down former Blade Runner Rick Deckard, missing for thirty years."
    }
]
load_dotenv()  # reads your .env file

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL")

# -------------------------------------------------------------------
# Step A: Convert Movie Records into LangChain Documents
# -------------------------------------------------------------------
documents = []
for movie in movie_data:
    content = f"Title: {movie['title']}\nDirector: {movie['director']}\nYear: {movie['year']}\nPlot: {movie['plot']}"
    
    doc = Document(
        page_content=content,
        metadata={"title": movie["title"], "genre": movie["genre"], "year": movie["year"]}
    )
    documents.append(doc)

# -------------------------------------------------------------------
# Step B: Index Documents into Chroma Vector Database via OpenRouter
# -------------------------------------------------------------------
embeddings = OpenAIEmbeddings(
    model="openai/text-embedding-3-small",
    openai_api_key=OPENROUTER_API_KEY,
    openai_api_base=OPENROUTER_BASE_URL
)

vectorstore = Chroma.from_documents(documents=documents, embedding=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

# -------------------------------------------------------------------
# Step C: Define Prompt Template and OpenRouter LLM Chain
# -------------------------------------------------------------------
system_prompt = (
    "You are an expert movie recommendations chatbot specializing in Sci-Fi movies.\n"
    "Answer the user's question using ONLY the retrieved movie context below.\n"
    "If the answer cannot be found in the context, politely state that you don't know.\n\n"
    "Context:\n{context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

# Use any OpenRouter model slug (e.g., openai/gpt-4o-mini, meta-llama/llama-3.3-70b-instruct, etc.)
llm = ChatOpenAI(
    model="openai/gpt-4o-mini",
    temperature=0.2,
    openai_api_key=OPENROUTER_API_KEY,
    openai_api_base=OPENROUTER_BASE_URL,
    default_headers={
        "HTTP-Referer": "http://localhost:3000", # Optional OpenRouter site header
        "X-Title": "Movie RAG App"               # Optional OpenRouter title header
    }
)

question_answer_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

# -------------------------------------------------------------------
# Step D: Query the Movie RAG Chatbot
# -------------------------------------------------------------------
query = "Which movie features space travel through a wormhole to save humanity?"
response = rag_chain.invoke({"input": query})

print("🤖 Response:\n", response["answer"])