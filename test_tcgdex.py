import urllib.request
import json

def search(name):
    url = f"https://api.tcgdex.net/v2/en/cards?name={urllib.parse.quote(name)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req)
        data = json.loads(response.read())
        print(f"Search '{name}': {len(data)} results")
        if data:
            print(f"  First result: {data[0].get('name')}")
    except Exception as e:
        print(f"Error searching for {name}: {e}")

search("Iron Valiant")
search("Roaring Moon")
search("Jangmo-o")
search("Ho-Oh")
search("Ting-Lu")
search("Nidoran M")
search("Nidoran")
