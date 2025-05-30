#!/usr/bin/env python3
"""
Final test script for the corrected ContextAgent implementation
Tests the actual working LlamaStack APIs
"""
import requests
import json
import time

def test_final_implementation():
    """Test the corrected ContextAgent implementation"""
    print("🚀 Testing Final ContextAgent Implementation")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    
    # Test 1: Health check
    print("\n🔍 1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            context_agent = data.get("services", {}).get("context_agent", {})
            health = context_agent.get("health", {})
            
            print(f"✅ Health endpoint working")
            print(f"   Agent ID: {context_agent.get('agent_id')}")
            print(f"   Health Status: {health.get('status', 'unknown')}")
            print(f"   Test Query Success: {health.get('test_query_success', 'unknown')}")
            print(f"   Context Chunks: {health.get('context_chunks_returned', 0)}")
        else:
            print(f"❌ Health failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health test failed: {e}")
        return False
    
    # Test 2: Direct context query
    print("\n🔍 2. Testing context query endpoint...")
    try:
        payload = {
            "query": "How to create an Ansible playbook for installing Docker on Ubuntu?",
            "top_k": 3
        }
        response = requests.post(f"{base_url}/api/v2/context/query", 
                               json=payload, timeout=60)  # Longer timeout for RAG
        
        print(f"   Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            context = data.get("context", [])
            print(f"✅ Context query successful")
            print(f"   Retrieved {len(context)} context chunks")
            
            if context:
                # Show preview of first chunk
                first_chunk = context[0].get("text", "")
                preview = first_chunk[:150] + "..." if len(first_chunk) > 150 else first_chunk
                print(f"   Preview: {preview}")
                
                # Check if it's a meaningful response
                if "No relevant patterns found" in first_chunk:
                    print("   ℹ️  Vector DB appears to be empty (normal for new setup)")
                else:
                    print("   🎉 Retrieved actual context from vector DB!")
            else:
                print("   ⚠️  No context chunks returned")
            
            return True
        else:
            try:
                error_data = response.json()
                print(f"❌ Context query failed: {error_data.get('detail', response.text)}")
            except:
                print(f"❌ Context query failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Context query test failed: {e}")
        return False

def test_llamastack_apis_directly():
    """Test LlamaStack APIs directly to verify they work"""
    print("\n🔍 3. Testing LlamaStack APIs directly...")
    
    LLAMASTACK_URL = "http://lss-chai.apps.cluster-7nc6z.7nc6z.sandbox2170.opentlc.com"
    AGENT_ID = "04042f73-9b43-4a3c-a4bb-3a2c7aecd0eb"
    
    # Test session creation
    try:
        session_url = f"{LLAMASTACK_URL}/v1/agents/{AGENT_ID}/session"
        session_payload = {"session_name": f"test-session-{int(time.time())}"}
        
        resp = requests.post(session_url, json=session_payload, timeout=10)
        if resp.status_code == 200:
            session_data = resp.json()
            session_id = session_data.get("session_id") or session_data
            print(f"✅ Session created: {session_id}")
            
            # Test turn creation
            turn_url = f"{LLAMASTACK_URL}/v1/agents/{AGENT_ID}/session/{session_id}/turn"
            turn_payload = {
                "messages": [{"role": "user", "content": "test query"}],
                "stream": False
            }
            
            resp = requests.post(turn_url, json=turn_payload, timeout=30)
            print(f"   Turn response: {resp.status_code}")
            if resp.status_code == 200:
                print("✅ Session/turn API working correctly")
                return True
            else:
                print(f"❌ Turn failed: {resp.text[:200]}")
                return False
        else:
            print(f"❌ Session creation failed: {resp.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Direct LlamaStack test failed: {e}")
        return False

def test_vector_db_query():
    """Test vector DB query directly"""
    print("\n🔍 4. Testing vector DB query...")
    
    LLAMASTACK_URL = "http://lss-chai.apps.cluster-7nc6z.7nc6z.sandbox2170.opentlc.com"
    
    try:
        # Test vector-io query
        url = f"{LLAMASTACK_URL}/v1/vector-io/query"
        payload = {
            "vector_db_id": "iac",
            "query": "docker installation",
            "params": {"top_k": 3}
        }
        
        resp = requests.post(url, json=payload, timeout=15)
        print(f"   Vector-io query response: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            print(f"✅ Vector DB query successful: {len(results)} results")
            return True
        else:
            print(f"   Vector-io failed: {resp.text[:200]}")
            
            # Try RAG tool endpoint
            url = f"{LLAMASTACK_URL}/v1/tool-runtime/rag-tool/query"
            payload = {
                "content": "docker installation",
                "vector_db_ids": ["iac"],
                "query_config": {"max_chunks": 3}
            }
            
            resp = requests.post(url, json=payload, timeout=15)
            print(f"   RAG tool query response: {resp.status_code}")
            
            if resp.status_code == 200:
                print("✅ RAG tool query working")
                return True
            else:
                print(f"   RAG tool failed: {resp.text[:200]}")
                return False
                
    except Exception as e:
        print(f"❌ Vector DB query test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🎯 Final ContextAgent Implementation Test Suite")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_final_implementation),
        ("LlamaStack Direct", test_llamastack_apis_directly),
        ("Vector DB Query", test_vector_db_query),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test '{test_name}' failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 FINAL TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status_icon = "✅" if result else "❌"
        print(f"{status_icon} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! ContextAgent is working correctly.")
        print("\n💡 Next steps:")
        print("   - Add documents to your vector DB using the data ingestion endpoints")
        print("   - Test with real Ansible/IaC queries")
        print("   - Monitor the /health endpoint for ongoing status")
    elif passed > 0:
        print("✅ ContextAgent is partially working - some functionality available")
    else:
        print("❌ ContextAgent needs further debugging")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    exit(main())