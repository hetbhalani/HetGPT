from tools import Tools
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage, SystemMessage
from langchain_ollama import ChatOllama
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace

model = HuggingFaceEndpoint(
    repo_id='moonshotai/Kimi-K2-Thinking',
    task='text-generation'
)

llm = ChatHuggingFace(llm=model)


# llm = ChatOllama(
#     model="qwen2.5:7b-instruct",
#     base_url="https://clark-spouse-belkin-started.trycloudflare.com/",
#     temperature=0,
# )
    
tools = [Tools.what_the_duck, Tools.wiki, Tools.weather, Tools.news]
llm_w_tools = llm.bind_tools(tools)

def process_query(query):
    messages = [
        SystemMessage(content="You are a helpful assistant. Use the available tools to answer questions. After using tools and getting results, provide a clear, natural language answer to the user. Do not make repeated tool calls with the same tool."),
        HumanMessage(content=query)
    ]    
    response = llm_w_tools.invoke(messages)
    messages.append(response)
    
    max_iterations = 5
    iteration = 0
    
    while hasattr(response, "tool_calls") and response.tool_calls and iteration < max_iterations:
        iteration += 1
        
        for tool_call in response.tool_calls:
            print(response)
            tool_name = tool_call["name"]
            args = tool_call["args"]
            tool_id = tool_call["id"]
            
            selected_tool = {
                "what_the_duck": Tools.what_the_duck,
                "wiki": Tools.wiki,
                "weather": Tools.weather,
                "news":Tools.news
            }.get(tool_name)
            
            if selected_tool:
                try:
                    tool_output = selected_tool.invoke(args)
                    
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

print(process_query("weather in kashmir"))   