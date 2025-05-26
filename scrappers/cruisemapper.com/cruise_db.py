import boto3
import csv
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-1')
table = dynamodb.Table('cruisemapper')

def batch_write(items, total, current):
    with table.batch_writer() as batch:
        for item in items:
            # Убедитесь, что cruise_id преобразуется в число
            try:
                item['cruise_id'] = int(item['cruise_id'])
            except ValueError:
                print(f"Ошибка преобразования cruise_id '{item['cruise_id']}' в число.")
                continue  # Пропустите эту запись, если cruise_id не может быть преобразовано
            batch.put_item(Item=item)
            current += 1
            if current % 25 == 0 or current == total:
                print(f"{datetime.now()}: Вставлено {current} из {total} записей.")
    return current

def read_csv_and_prepare_items(filename):
    items = []
    total_inserted = 0
    with open(filename, mode='r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        rows = list(csv_reader)  # Преобразование в список для подсчета total
        total = len(rows)
        for row in rows:
            item = {key.lower().replace(" ", "_"): value for key, value in row.items() if key != "Cruise Price FX" and value}
            items.append(item)
            if len(items) == 25:
                total_inserted = batch_write(items, total, total_inserted)
                items = []
        if items:  # Запись оставшихся элементов, если они есть
            total_inserted = batch_write(items, total, total_inserted)

filename = 'cruises_data.csv'
read_csv_and_prepare_items(filename)
