import csv
import boto3

# Настройка клиента DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-1')
table = dynamodb.Table('cruisemapper')

def read_csv_and_upload_to_dynamodb(filename):
    with open(filename, mode='r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            # Преобразование 'cruise_id' из строки в число (если возможно)
            try:
                cruise_id = int(row['Cruise ID'])
            except ValueError:
                print(f"Невозможно преобразовать cruise_id '{row['Cruise ID']}' в число.")
                continue  # Пропустить эту запись, если cruise_id не может быть преобразован в число
            
            item = {
                'cruise_id': cruise_id,  # Используем преобразованное значение
                'cruise_date': row['Cruise Date'],
                'cruise_line_logo': row['Cruise Line Logo'],
                'cruise_line_name': row['Cruise Line Name'],
                'cruise_ship_name': row['Cruise Ship Name'],
                'cruise_name': row['Cruise Name'],
                'cruise_price': row['Cruise Price']
            }
            # Исключаем пустые поля
            item = {k: v for k, v in item.items() if v}
            
            table.put_item(Item=item)

if __name__ == "__main__":
    filename = 'cruises_data.csv'  # Убедитесь, что имя файла и расширение указаны правильно
    read_csv_and_upload_to_dynamodb(filename)
    print("Data upload to DynamoDB completed.")
