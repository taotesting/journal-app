#!/usr/bin/env python3
"""
Obsidian to Journal App Migration Script

Usage:
1. Set OBSIDIAN_VAULT_PATH to your vault location
2. Set SUPABASE_URL and SUPABASE_KEY environment variables
3. Run: python3 migrate_obsidian.py

Requirements:
pip install supabase python-frontmatter
"""

import os
import glob
import frontmatter
from supabase import create_client, Client
from datetime import datetime

# Configuration
OBSIDIAN_VAULT_PATH = os.environ.get('OBSIDIAN_VAULT_PATH', './vault')
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

def parse_obsidian_entry(filepath: str) -> dict | None:
    """Parse an Obsidian markdown file and extract journal data."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            post = frontmatter.load(f)
            
        # Extract frontmatter
        front = post.metadata
        
        # Get date from frontmatter or filename
        date = front.get('date')
        if not date:
            # Try to extract from filename (YYYY-MM-DD.md)
            filename = os.path.basename(filepath)
            date = filename.replace('.md', '')[:10]
        
        if isinstance(date, str):
            date = datetime.strptime(date[:10], '%Y-%m-%d').date().isoformat()
        
        # Extract scores
        p_score = front.get('p-score') or front.get('p_score') or front.get('p')
        l_score = front.get('l-score') or front.get('l_score') or front.get('l')
        weight = front.get('weight')
        
        # Extract tags
        tags = front.get('tags', [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.replace('[', '').replace(']', '').split(',')]
        
        # Extract body sections
        body = post.content
        
        # Simple section parsing
        morning = ''
        afternoon = ''
        night = ''
        highlights_high = ''
        highlights_low = ''
        
        # Try to parse sections from body
        sections = body.split('## ')
        for section in sections:
            section = section.strip()
            if section.lower().startswith('morning'):
                morning = section.replace('Morning', '').replace('morning', '').strip()
            elif section.lower().startswith('afternoon'):
                afternoon = section.replace('Afternoon', '').replace('afternoon', '').strip()
            elif section.lower().startswith('night') or section.lower().startswith('evening'):
                night = section.replace('Night', '').replace('night', '').replace('Evening', '').replace('evening', '').strip()
            elif section.lower().startswith('high') or section.lower().startswith('highlights'):
                highlights_high = section.split('\n')[0][10:].strip() if 'High:' in section else section.split('\n')[0].strip()
        
        return {
            'date': date,
            'morning': morning or None,
            'afternoon': afternoon or None,
            'night': night or None,
            'highlights_high': highlights_high or None,
            'highlights_low': highlights_low or None,
            'p_score': int(p_score) if p_score else None,
            'l_score': int(l_score) if l_score else None,
            'weight': float(weight) if weight else None,
            'tags': tags,
        }
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return None

def migrate(supabase: Client):
    """Migrate all Obsidian entries to Supabase."""
    # Find all markdown files
    md_files = glob.glob(f"{OBSIDIAN_VAULT_PATH}/**/*.md", recursive=True)
    
    # Filter to journal entries (you might want to adjust this pattern)
    journal_files = [f for f in md_files if 'journal' in f.lower() or 'daily' in f.lower()]
    
    print(f"Found {len(journal_files)} journal files")
    
    imported = 0
    errors = 0
    
    for filepath in journal_files:
        entry_data = parse_obsidian_entry(filepath)
        if not entry_data:
            errors += 1
            continue
        
        # Insert into Supabase
        try:
            result = supabase.table('entries').upsert(
                entry_data,
                on_conflict='user_id,date'
            ).execute()
            
            if result.data:
                imported += 1
                print(f"✓ Imported: {entry_data['date']}")
        except Exception as e:
            errors += 1
            print(f"✗ Error importing {filepath}: {e}")
    
    print(f"\nMigration complete: {imported} imported, {errors} errors")

if __name__ == '__main__':
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Please set SUPABASE_URL and SUPABASE_KEY environment variables")
        exit(1)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    migrate(supabase)
