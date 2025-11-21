from langchain_core.tools import tool
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from dotenv import load_dotenv
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.messages import HumanMessage, ToolMessage

load_dotenv()

llm = HuggingFaceEndpoint(
    name="deepseek-ai/DeepSeek-V3",
    task='conversational'
)

model = ChatHuggingFace(llm=llm)

what_the_duck = DuckDuckGoSearchRun()

