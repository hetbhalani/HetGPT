from langchain_core.tools import tool
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from dotenv import load_dotenv
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
# from langchain_community.chat_models import ChatOllama
from langchain_ollama import ChatOllama

llm = ChatOllama(
    model="llama3.1:latest",
    base_url="https://joel-trailers-dual-wisdom.trycloudflare.com/"
)

load_dotenv()

# llm = HuggingFaceEndpoint(
#     repo_id="deepseek-ai/DeepSeek-V3",
#     task="text-generation"
# )

prompt = PromptTemplate(
    template="""
You are an AI assistant with access to tools.

ROUTING RULES:

- Use `what_the_duck` ONLY for:
    • latest news
    • current events
    • factual info that changes often
    • real-time data

- Use `wiki` ONLY for:
    • historical facts
    • well-established information
    • biographies
    • definitions

- For math, logic, coding, general conversation:
    • DO NOT call any tool.

AFTER A TOOL CALL:
- Read the tool output EXACTLY as given.
- DO NOT hallucinate or guess missing information.
- Summarize ONLY from the tool output.
- If the tool output includes multiple results, extract the relevant ones.
- If the tool output is empty, say: “No data found.”

Think step-by-step.

Query: {query}
""",
    input_variables=["query"]
)

parser = StrOutputParser()

@tool
def what_the_duck(query: str):
    """Search DuckDuckGo when the query asks for latest or real-time info."""
    return DuckDuckGoSearchRun().invoke({'query':query})

@tool
def wiki(query: str):
    """Query Wikipedia for historical or stable information."""
    wiki_api = WikipediaAPIWrapper(top_k_results=5,doc_content_chars_max=50)
    return WikipediaQueryRun(api_wrapper=wiki_api).invoke({'query': query})

tools = [what_the_duck, wiki]

llm_w_tools = llm.bind_tools(tools)

def process_query(query):
    messages = [HumanMessage(content=prompt.format(query=query))]

    res = llm_w_tools.invoke(messages)

    while hasattr(res, "tool_calls") and res.tool_calls:
        for tool_call in res.tool_calls:
            tool_name = tool_call["name"]
            args = tool_call["args"]
            tool_id = tool_call["id"]

            selected_tool = {"what_the_duck": what_the_duck,
                             "wiki": wiki}[tool_name]

            tool_output = selected_tool.invoke(args)

            messages.append(
                ToolMessage(
                    content=str(tool_output),
                    name=tool_name,
                    tool_call_id=tool_id
                )
            )

        res = llm_w_tools.invoke(messages)

    return res.content

print(process_query("tell me about blackholes"))