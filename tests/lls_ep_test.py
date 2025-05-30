#!/usr/bin/env python3
"""
LlamaStack API endpoint tester to diagnose which endpoints are available
"""
import requests
import json

# Configuration
LLAMASTACK_URL = "http://lss-chai.apps.cluster-7nc6z.7nc6z.sandbox2170.opentlc.com"
AGENT_ID = "04042f73-9b43-4a3c-a4bb-3a2c7aecd0eb"
VECTOR_DB_ID = "iac"

def test_endpoint(method, url, payload=None, description=""):
    """Test an API endpoint and return results"""
    try:
        if method.upper() == "GET":
            resp = requests.get(url, timeout=10)
        elif method.upper() == "POST":
            resp = requests.post(url, json=payload, timeout=10)
        else:
            return {"error": f"Unsupported method: {method}"}
        
        result = {
            "status_code": resp.status_code,
            "success": resp.status_code < 400,
            "url": url,
            "method": method.upper()
        }
        
        if resp.status_code < 400:
            try:
                result["response_preview"] = str(resp.json())[:200] + "..." if len(str(resp.json())) > 200 else resp.json()
            except:
                result["response_preview"] = resp.text[:200] + "..." if len(resp.text) > 200 else resp.text
        else:
            result["error_detail"] = resp.text
            
        return result
    except Exception as e:
        return {"error": str(e), "url": url, "method": method.upper()}

def main():
    print("🔍 Testing LlamaStack API Endpoints")
    print("=" * 60)
    
    endpoints_to_test = [
        # Basic info endpoints
        ("GET", f"{LLAMASTACK_URL}/v1/agents", None, "List all agents"),
        ("GET", f"{LLAMASTACK_URL}/v1/agents/{AGENT_ID}", None, "Get specific agent info"),
        ("GET", f"{LLAMASTACK_URL}/v1/vector-dbs", None, "List vector databases"),
        ("GET", f"{LLAMASTACK_URL}/v1/vector-dbs/{VECTOR_DB_ID}", None, "Get vector DB info"),
        
        # Inference endpoints (the ones we've been trying)
        ("POST", f"{LLAMASTACK_URL}/v1/inference/chat_completion", {
            "agent_id": AGENT_ID,
            "messages": [{"role": "user", "content": "test query"}],
            "stream": False
        }, "Chat completion inference"),
        
        ("POST", f"{LLAMASTACK_URL}/v1/inference/completion", {
            "agent_id": AGENT_ID,
            "content": "test query"
        }, "Direct completion inference"),
        
        # Agent-specific endpoints
        ("POST", f"{LLAMASTACK_URL}/v1/agents/{AGENT_ID}/complete", {
            "content": "test query",
            "top_k": 3
        }, "Agent completion"),
        
        ("POST", f"{LLAMASTACK_URL}/v1/agents/{AGENT_ID}/inference", {
            "messages": [{"role": "user", "content": "test query"}]
        }, "Agent inference"),
        
        # Session endpoints (we know these fail)
        ("POST", f"{LLAMASTACK_URL}/v1/agents/{AGENT_ID}/session", {
            "session_name": "test-session"
        }, "Create session"),
        
        # Vector DB search endpoints
        ("POST", f"{LLAMASTACK_URL}/v1/vector-dbs/{VECTOR_DB_ID}/search", {
            "query": "test query",
            "top_k": 3
        }, "Vector DB search"),
        
        ("POST", f"{LLAMASTACK_URL}/v1/vector-dbs/{VECTOR_DB_ID}/query", {
            "query": "test query",
            "top_k": 3
        }, "Vector DB query"),
        
        # RAG-specific endpoints
        ("POST", f"{LLAMASTACK_URL}/v1/rag/query", {
            "agent_id": AGENT_ID,
            "query": "test query",
            "top_k": 3
        }, "RAG query"),
        
        ("POST", f"{LLAMASTACK_URL}/v1/rag/{AGENT_ID}/query", {
            "query": "test query",
            "top_k": 3
        }, "RAG agent query"),
    ]
    
    results = {}
    working_endpoints = []
    
    for method, url, payload, description in endpoints_to_test:
        print(f"\n🧪 Testing: {description}")
        print(f"   {method} {url}")
        
        result = test_endpoint(method, url, payload, description)
        results[description] = result
        
        if result.get("success"):
            print(f"   ✅ SUCCESS ({result['status_code']})")
            working_endpoints.append(description)
            if "response_preview" in result:
                print(f"   📄 Response: {result['response_preview']}")
        else:
            status = result.get("status_code", "ERROR")
            print(f"   ❌ FAILED ({status})")
            if "error_detail" in result:
                print(f"   💬 Error: {result['error_detail']}")
            elif "error" in result:
                print(f"   💬 Error: {result['error']}")
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 SUMMARY")
    print(f"{'='*60}")
    print(f"Working endpoints: {len(working_endpoints)}/{len(endpoints_to_test)}")
    
    if working_endpoints:
        print(f"\n✅ Working endpoints:")
        for endpoint in working_endpoints:
            print(f"   - {endpoint}")
    
    failed_endpoints = [desc for desc in results.keys() if not results[desc].get("success")]
    if failed_endpoints:
        print(f"\n❌ Failed endpoints:")
        for endpoint in failed_endpoints:
            status = results[endpoint].get("status_code", "ERROR")
            print(f"   - {endpoint} ({status})")
    
    # Recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    if any("inference" in desc for desc in working_endpoints):
        print("   - Use inference endpoints for queries")
    elif any("complete" in desc for desc in working_endpoints):
        print("   - Use completion endpoints for queries")
    elif any("search" in desc for desc in working_endpoints):
        print("   - Use direct vector search endpoints")
    else:
        print("   - No working query endpoints found - check LlamaStack configuration")
    
    return results

if __name__ == "__main__":
    results = main()
    
    # Save detailed results to file for analysis
    with open("llamastack_api_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n📝 Detailed results saved to llamastack_api_test_results.json")