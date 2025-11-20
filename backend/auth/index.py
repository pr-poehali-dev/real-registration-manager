'''
Business: User authentication with email/password and Google OAuth
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with user data or error
'''

import json
import os
import hashlib
import hmac
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'register':
                email = body.get('email')
                password = body.get('password')
                display_name = body.get('display_name')
                
                if not email or not password or not display_name:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing required fields'})
                    }
                
                password_hash = hash_password(password)
                
                cur.execute(
                    "INSERT INTO users (email, password_hash, display_name) VALUES (%s, %s, %s) RETURNING id, email, display_name, avatar_url, created_at",
                    (email, password_hash, display_name)
                )
                user = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'user': dict(user)}, default=str)
                }
            
            elif action == 'login':
                email = body.get('email')
                password = body.get('password')
                
                if not email or not password:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing email or password'})
                    }
                
                password_hash = hash_password(password)
                
                cur.execute(
                    "SELECT id, email, display_name, avatar_url, created_at FROM users WHERE email = %s AND password_hash = %s",
                    (email, password_hash)
                )
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid credentials'})
                    }
                
                cur.execute(
                    "UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = %s",
                    (user['id'],)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'user': dict(user)}, default=str)
                }
            
            elif action == 'google_auth':
                google_id = body.get('google_id')
                email = body.get('email')
                display_name = body.get('display_name')
                avatar_url = body.get('avatar_url')
                
                if not google_id or not email or not display_name:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing Google auth data'})
                    }
                
                cur.execute(
                    "SELECT id, email, display_name, avatar_url, created_at FROM users WHERE google_id = %s",
                    (google_id,)
                )
                user = cur.fetchone()
                
                if user:
                    cur.execute(
                        "UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = %s",
                        (user['id'],)
                    )
                    conn.commit()
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'user': dict(user)}, default=str)
                    }
                
                cur.execute(
                    "INSERT INTO users (email, google_id, display_name, avatar_url) VALUES (%s, %s, %s, %s) RETURNING id, email, display_name, avatar_url, created_at",
                    (email, google_id, display_name, avatar_url)
                )
                user = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'user': dict(user)}, default=str)
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except psycopg2.IntegrityError as e:
        if conn:
            conn.rollback()
        return {
            'statusCode': 409,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User already exists'})
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
