'''
Business: Manage friend requests and contacts
Args: event with httpMethod, body, headers (X-User-Id)
Returns: HTTP response with contacts, requests, or search results
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
        
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action', 'friends')
            
            if action == 'friends':
                cur.execute("""
                    SELECT u.id, u.display_name, u.email, u.avatar_url, u.last_seen
                    FROM users u
                    INNER JOIN friendships f ON (f.user1_id = u.id OR f.user2_id = u.id)
                    WHERE (f.user1_id = %s OR f.user2_id = %s) AND u.id != %s
                    ORDER BY u.last_seen DESC
                """, (user_id, user_id, user_id))
                friends = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'friends': [dict(f) for f in friends]}, default=str)
                }
            
            elif action == 'requests':
                cur.execute("""
                    SELECT fr.id, fr.sender_id, fr.status, fr.created_at,
                           u.display_name, u.email, u.avatar_url
                    FROM friend_requests fr
                    INNER JOIN users u ON u.id = fr.sender_id
                    WHERE fr.receiver_id = %s AND fr.status = 'pending'
                    ORDER BY fr.created_at DESC
                """, (user_id,))
                requests = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'requests': [dict(r) for r in requests]}, default=str)
                }
            
            elif action == 'search':
                query = params.get('q', '')
                if len(query) < 2:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Query too short'})
                    }
                
                search_pattern = f'%{query}%'
                cur.execute("""
                    SELECT id, display_name, email, avatar_url
                    FROM users
                    WHERE (display_name ILIKE %s OR email ILIKE %s) AND id != %s
                    LIMIT 20
                """, (search_pattern, search_pattern, user_id))
                results = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'results': [dict(r) for r in results]}, default=str)
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'send_request':
                receiver_id = body.get('receiver_id')
                
                if not receiver_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing receiver_id'})
                    }
                
                cur.execute(
                    "INSERT INTO friend_requests (sender_id, receiver_id) VALUES (%s, %s) RETURNING id",
                    (user_id, receiver_id)
                )
                request_id = cur.fetchone()['id']
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'request_id': request_id})
                }
            
            elif action == 'accept_request':
                request_id = body.get('request_id')
                
                cur.execute(
                    "SELECT sender_id, receiver_id FROM friend_requests WHERE id = %s AND receiver_id = %s AND status = 'pending'",
                    (request_id, user_id)
                )
                request = cur.fetchone()
                
                if not request:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Request not found'})
                    }
                
                user1 = min(request['sender_id'], request['receiver_id'])
                user2 = max(request['sender_id'], request['receiver_id'])
                
                cur.execute(
                    "INSERT INTO friendships (user1_id, user2_id) VALUES (%s, %s)",
                    (user1, user2)
                )
                cur.execute(
                    "UPDATE friend_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (request_id,)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
            
            elif action == 'reject_request':
                request_id = body.get('request_id')
                
                cur.execute(
                    "UPDATE friend_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = %s AND receiver_id = %s",
                    (request_id, user_id)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except psycopg2.IntegrityError:
        if conn:
            conn.rollback()
        return {
            'statusCode': 409,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Request already exists'})
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
