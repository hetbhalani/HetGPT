from langchain_core.tools import tool
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from dotenv import load_dotenv
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.messages import HumanMessage, ToolMessage

load_dotenv()

def message_for_AI(res, message):
    message.append(res)
    
    for i in res.tool_calls:
        selected = {
            "addition": addition,
            "multiplication": multiplication,
            "wikipedia": wiki_tool,
            "duckduckgo_search": duck_tool
        }[i["name"].lower()]

        tool_output = selected.invoke(i["args"])

        message.append(
            ToolMessage(
                content=str(tool_output),
                name=i["name"],
                tool_call_id=i["id"]     
            )
        )

    return llm_with_tools.invoke(message)

llm = HuggingFaceEndpoint(
    repo_id='moonshotai/Kimi-K2-Thinking',
    task='text-generation'
)

model = ChatHuggingFace(llm=llm)


@tool
def multiplication(a: int, b: int) -> int:
    """This is a function for multiply two numbers"""
    return a*b

@tool
def addition(a: int, b: int) -> int:
    """This is a function for add two numbers"""
    return a+b

wiki_api = WikipediaAPIWrapper(top_k_results=5,doc_content_chars_max=50)
wiki_tool = WikipediaQueryRun(api_wrapper=wiki_api)

duck_tool = DuckDuckGoSearchRun()

tools = [multiplication, addition, wiki_tool, duck_tool]

llm_with_tools = model.bind_tools(tools)

query = "multiply 6 and 5 and then add the answer with 10"

message = [HumanMessage(query)]

res = llm_with_tools.invoke(message)

while hasattr(res, "tool_calls") and res.tool_calls:
    res = message_for_AI(res, message)

print(res.content)