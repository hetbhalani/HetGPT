from langchain_core.tools import tool
from dotenv import load_dotenv
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from langchain_ollama import ChatOllama


load_dotenv()

llm = ChatOllama(
    model="qwen2.5:7b-instruct",
    base_url="https://clark-spouse-belkin-started.trycloudflare.com/",
    temperature=0,
)

@tool
def what_the_duck(query: str):
    """Search DuckDuckGo for current, real-time information like weather, news, or latest events."""
    return DuckDuckGoSearchRun().invoke(query)

@tool
def wiki(query: str):
    """Query Wikipedia for historical facts, definitions, or stable information."""
    wiki_api = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=500)
    return WikipediaQueryRun(api_wrapper=wiki_api).invoke(query) 

tools = [what_the_duck, wiki]
llm_w_tools = llm.bind_tools(tools)

def process_query(query):
    messages = [HumanMessage(content=query)]
    
    response = llm_w_tools.invoke(messages)
    messages.append(response)
    
    max_iterations = 5
    iteration = 0
    
    while hasattr(response, "tool_calls") and response.tool_calls and iteration < max_iterations:
        iteration += 1
        
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            args = tool_call["args"]
            tool_id = tool_call["id"]
            
            selected_tool = {"what_the_duck": what_the_duck, "wiki": wiki}.get(tool_name)
            
            if selected_tool:
                try:
                    tool_output = selected_tool.invoke(args.get("query", ""))
                    
                    messages.append(
                        ToolMessage(
                            content=str(tool_output),
                            name=tool_name,
                            tool_call_id=tool_id
                        )
                    )
                except Exception as e:
                    messages.append(
                        ToolMessage(
                            content=f"Error: {str(e)}",
                            name=tool_name,
                            tool_call_id=tool_id
                        )
                    )
        
        response = llm_w_tools.invoke(messages)
        messages.append(response)
    
    return response.content

print(process_query("how many r are there in strawbarry"))