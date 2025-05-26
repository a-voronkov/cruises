import boto3
import requests
from bs4 import BeautifulSoup
from html import unescape
from datetime import datetime, timedelta
import json
import re

# Настройка клиента для DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-1')
table = dynamodb.Table('cruisemapper')

def fetch_cruise_route(cruise_id):
    url = f"https://www.cruisemapper.com/ships/cruise.json?id={cruise_id}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        'authority': 'www.cruisemapper.com',
        'method': 'GET',
        'scheme': 'https',
        "x-requested-with": "XMLHttpRequest"
    }

    response = requests.get(url, headers=headers)
    
    # Проверка статуса ответа
    if response.status_code == 200:
        try:
            return response.json()['result']
        except ValueError as e:
            print(f"Ошибка декодирования JSON: {e}")
            print(f"Ответ сервера: {response.text}")
    else:
        print(f"Ошибка запроса: HTTP {response.status_code}")
        print(f"Ответ сервера: {response.text}")
    return None

def parse_route(html, cruise_year):
    soup = BeautifulSoup(html, 'html.parser')
    rows = soup.find_all('tr')
    route = []

    date_pattern = re.compile(r"(\d{2} \w{3})")  # Регулярное выражение для извлечения даты

    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 2: continue

        date_text = cells[0].get_text(strip=True)
        start_date_str = date_pattern.search(date_text)
        end_date_str = date_pattern.findall(date_text)[-1] if len(date_pattern.findall(date_text)) > 1 else start_date_str.group()

        if start_date_str:
            start_date_str = start_date_str.group()
            try:
                start_date = datetime.strptime(f"{start_date_str} {cruise_year}", "%d %b %Y").date()
                end_date = datetime.strptime(f"{end_date_str} {cruise_year}", "%d %b %Y").date()
            except ValueError as e:
                print(f"Не удалось обработать дату {date_text} {cruise_year}: {e}")
                continue

            current_date = start_date
            while current_date <= end_date:
                country_span = cells[1].find('span', class_='flag-icon')
                country = country_span['title'] if country_span else ''

                port_text = cells[1].get_text(strip=True)
                port = unescape(port_text)
                port = port.replace("Departingfrom", "").replace("Arrivingin", "")

                route.append({'date': current_date.isoformat(), 'country': country, 'port': port})
                current_date += timedelta(days=1)

    return route

def update_cruise_route(cruise_id, route):
    table.update_item(
        Key={'cruise_id': cruise_id},
        UpdateExpression='SET route = :val',
        ExpressionAttributeValues={':val': route}
    )

def main():
    exclusive_start_key = None
    total_processed = 0

    while True:
        if exclusive_start_key:
            response = table.scan(Limit=100, ExclusiveStartKey=exclusive_start_key)
        else:
            response = table.scan(Limit=100)

        items_without_route = response['Items']
        total_items = len(items_without_route)

        if not items_without_route:
            print("Finished processing all items.")
            break

        for item in items_without_route:
            cruise_id = item['cruise_id']

            total_processed += 1
            
            if 'route' in item:
                print(f"Skipped {cruise_id} because it already has a route.")
                continue

            cruise_date = item.get('cruise_date', '')
            cruise_year = datetime.strptime(cruise_date, "%Y %b %d").year if cruise_date else datetime.now().year

            html_result = fetch_cruise_route(cruise_id)
            route = parse_route(html_result, cruise_year)
            #print(json.dumps(route, indent=4))
            update_cruise_route(cruise_id, route)
            print(f"Processed {cruise_id} with {len(route)} stops")

        print(f"Processed a batch of {total_items} items. Total processed so far: {total_processed}.")

        if 'LastEvaluatedKey' in response:
            exclusive_start_key = response['LastEvaluatedKey']
        else:
            break  # No more pages to process

if __name__ == "__main__":
    main()