'''
Business: Manage voice and video calls between users
Args: event with httpMethod, body, headers (X-User-Id)
Returns: HTTP response with call data and status
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('x-user-id') or headers.get('X-User-Id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'start_call':
                receiver_id = body.get('receiver_id')
                
                if not receiver_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing receiver_id'})
                    }
                
                cur.execute(
                    "INSERT INTO calls (caller_id, receiver_id, status) VALUES (%s, %s, 'active') RETURNING id, started_at",
                    (user_id, receiver_id)
                )
                call = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'call': dict(call)}, default=str)
                }
            
            elif action == 'end_call':
                call_id = body.get('call_id')
                
                if not call_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing call_id'})
                    }
                
                cur.execute("""
                    UPDATE calls 
                    SET status = 'ended', 
                        ended_at = CURRENT_TIMESTAMP,
                        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
                    WHERE id = %s AND (caller_id = %s OR receiver_id = %s)
                    RETURNING id, duration_seconds
                """, (call_id, user_id, user_id))
                
                call = cur.fetchone()
                
                if not call:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Call not found'})
                    }
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'call': dict(call)}, default=str)
                }
        
        elif method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action', 'history')
            
            if action == 'history':
                cur.execute("""
                    SELECT c.id, c.status, c.started_at, c.ended_at, c.duration_seconds,
                           c.caller_id, c.receiver_id,
                           u.display_name as other_user_name, u.avatar_url as other_user_avatar
                    FROM calls c
                    INNER JOIN users u ON (
                        CASE 
                            WHEN c.caller_id = %s THEN u.id = c.receiver_id
                            ELSE u.id = c.caller_id
                        END
                    )
                    WHERE c.caller_id = %s OR c.receiver_id = %s
                    ORDER BY c.started_at DESC
                    LIMIT 50
                """, (user_id, user_id, user_id))
                
                calls = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'calls': [dict(c) for c in calls]}, default=str)
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        if conn:
            conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
