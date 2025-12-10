from langchain_ollama import ChatOllama

llm = ChatOllama(
    model="qwen2.5:7b-instruct",
    base_url="https://marvel-prince-sister-deviation.trycloudflare.com/",
    temperature=0,
)

def cs_model_call(query: str):
    try:
        res = llm.invoke(query)
        # print(res.content)
        return res.content
    except Exception as e:
        print(f"Error: {e}")
        return None
