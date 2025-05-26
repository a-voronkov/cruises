import requests
from bs4 import BeautifulSoup
import csv

def get_cruise_data(page):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            'authority': 'www.cruisemapper.com',
            'method': 'GET',
            'scheme': 'https'
        }
        url = f"https://www.cruisemapper.com/cruise-search?portRegion=0&shipType=1&portDeparture=&portOfCall=&ship=&line=&departureFrom=&departureTo=&duration=0&type=0&price=0,2000&priceByNight=0,100&page={page}&shipType=1&price=0,2000&priceByNight=0,100"
        response = requests.get(url, headers=headers, timeout=10)  # Установка тайм-аута для запроса
        response.raise_for_status()  # Генерирует исключение для ответов 4xx/5xx
        soup = BeautifulSoup(response.text, 'html.parser')
        table = soup.find('table', class_='shipTableCruise')
        if table:
            return table.find('tbody').find_all('tr')
    except requests.RequestException as e:
        print(f"Error fetching page {page}: {e}")
        return []

def parse_and_write_to_csv(tr_elements, csv_writer):
    for tr in tr_elements:
        cruise_id = tr['data-row']
        cruise_date = tr.find('td', class_='cruiseDatetime').text.strip()
        cruise_line_logo = tr.find('img', class_='lineIconSmall')['src']
        cruise_line_name = tr.find('img', class_='lineIconSmall')['title']
        
        cruise_ship_name_element = tr.find_all('td')[1]  # Второй td содержит имя лайнера
        if cruise_ship_name_element.find('img'):
            cruise_ship_name = cruise_ship_name_element.find('img').next_sibling.strip()
        else:
            cruise_ship_name = cruise_ship_name_element.text.strip()

        cruise_name = tr.find('td', class_='cruiseTitle').get_text(strip=True)
        price_text = tr.find('td', class_='cruisePrice').text.strip()
        cruise_price = ''.join(filter(str.isdigit, price_text))
        cruise_price_fx = ''.join(filter(str.isalpha, price_text))

        csv_writer.writerow([
            cruise_id, cruise_date, cruise_line_logo, cruise_line_name,
            cruise_ship_name, cruise_name, cruise_price, cruise_price_fx
        ])
    return len(tr_elements)

# Открываем файл CSV на запись
with open('cruises_data.csv', mode='w', newline='', encoding='utf-8') as file:
    csv_writer = csv.writer(file)
    # Записываем заголовок CSV
    csv_writer.writerow([
        'Cruise ID', 'Cruise Date', 'Cruise Line Logo', 'Cruise Line Name',
        'Cruise Ship Name', 'Cruise Name', 'Cruise Price', 'Cruise Price FX'
    ])
    
    # Перебор страниц и запись данных в CSV
    for page in range(1, 2286):  # 2285 включительно
        tr_elements = get_cruise_data(page)
        if tr_elements:
            rows = parse_and_write_to_csv(tr_elements, csv_writer)
            print(f"Processed page {page} with {rows} rows")
        else:
            print(f"Page {page} is empty")

print("Data writing to CSV complete.")