from langchain_ollama import ChatOllama
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser 
from dotenv import load_dotenv

load_dotenv()

model = HuggingFaceEndpoint(
    repo_id='meta-llama/Llama-3.1-8B-Instruct',
    task='text-generation',
    timeout=300,
    max_new_tokens=512
)

llm = ChatHuggingFace(llm=model)

parser = StrOutputParser()

prompt = PromptTemplate(
        input_variables=["conversation"],
        template="""
            You convert short-term conversation into long-term memory.

            Rules:
            - Output plain text only.
            - One memory per line.
            - Each line must be a single stable fact, preference, goal, or confirmed decision.
            - Use third-person.
            - No questions, dialogue, explanations, or temporary requests.
            - Do not infer unstated information.

            Conversation:
            {conversation}

            Output only the memory lines.
        """
    )

# llm = ChatOllama(
#     model="qwen2.5:7b-instruct",
#     base_url="https://marvel-prince-sister-deviation.trycloudflare.com/",
#     temperature=0,
# )

def messages_to_text(history):
    clean_history = []
    for m in history:
        content = m.content
        if "Relevant facts from long-term memory:" in content:
            content = content.split("User query:")[-1].strip()
        clean_history.append(f"{m.type.upper()}: {content}")
        
    return "\n".join(clean_history)
    
def summary_model_call(history: list = None):
    try:
        conversation_text = messages_to_text(history)
        
        chain = prompt | llm | parser
        res = chain.invoke({'conversation': conversation_text})
        
        return "\n".join(
            line.strip() for line in res.split("\n") if line.strip()
        )
    
    except Exception as e:
        print(f"Error: {e}")
        return ""
