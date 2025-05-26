import boto3
import pymysql
from datetime import datetime

# Настройка клиента DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-1')
table = dynamodb.Table('cruisemapper')

# Параметры подключения к MariaDB
db_params = {
    'host': 'localhost',
    'user': 'root',
    'password': 'alf361red',
    'database': 'cruisemapper'
}

def insert_data_to_mariadb(data, connection):
    with connection.cursor() as cursor:
        # Добавление или обновление компании
        cursor.execute("""INSERT INTO companies (company_name, logo_url)
                          VALUES (%s, %s) ON DUPLICATE KEY UPDATE company_id=LAST_INSERT_ID(company_id)""",
                       (data['cruise_line_name'], data['cruise_line_logo']))
        company_id = cursor.lastrowid

        # Добавление или обновление корабля
        cursor.execute("""INSERT INTO ships (ship_name)
                          VALUES (%s) ON DUPLICATE KEY UPDATE ship_id=LAST_INSERT_ID(ship_id)""",
                       (data['cruise_ship_name'],))
        ship_id = cursor.lastrowid
        
        cruise_id = None
        # Проверяем, существует ли круиз с таким cruise_code
        cursor.execute("""SELECT cruise_id FROM cruises WHERE cruise_code = %s""", (data['cruise_id'],))
        cruise = cursor.fetchone()
        if cruise:
            cruise_id = cruise[0]
        else:
            # Добавление круиза, если он новый
            dates = [datetime.strptime(stop['date'], "%Y-%m-%d").date() for stop in data['route']]
            min_date = min(dates)
            max_date = max(dates)
            delta = max_date - min_date
            days = delta.days + 1  # Так как включаем день начала, добавляем 1
            nights = delta.days  # Количество ночей обычно на одну меньше, чем дней

            parsed_date = datetime.strptime(data['cruise_date'], '%Y %b %d')
            formatted_date = parsed_date.strftime('%Y-%m-%d')

            cursor.execute("""INSERT INTO cruises (cruise_code, cruise_name, date, days, nights)
                              VALUES (%s, %s, %s, %s, %s)""",
                           (data['cruise_id'], data['cruise_name'], formatted_date, days, nights))
            cruise_id = cursor.lastrowid

        # Добавление остановок и точек
        for stop in data['route']:
            # Предполагается, что 'point_name' и 'country' уникально идентифицируют точку
            point_name = stop['port']
            country = stop['country']
            # Добавление или обновление точки
            cursor.execute("""INSERT INTO points (point_name, country)
                              VALUES (%s, %s) ON DUPLICATE KEY UPDATE point_id=LAST_INSERT_ID(point_id)""",
                           (point_name, country))
            point_id = cursor.lastrowid
            
            # Добавление остановки
            # Предполагается, что для одной и той же точки в рамках одного круиза не может быть двух остановок в один и тот же день
            cursor.execute("""INSERT INTO stops (point_id, date, ship_id, cruise_id)
                              VALUES (%s, %s, %s, %s)""",
                           (point_id, stop['date'], ship_id, cruise_id))

    connection.commit()

def mark_data_as_exported(item_id):
    response = table.update_item(
        Key={'cruise_id': item_id},
        UpdateExpression='SET exported = :val',
        ExpressionAttributeValues={':val': datetime.now().isoformat()}
    )

def fetch_data_from_dynamodb(exclusive_start_key=None):
    if exclusive_start_key:
        response = table.scan(
            FilterExpression='attribute_not_exists(exported)',
            Limit=100,  # Увеличиваем количество записей до 100
            ExclusiveStartKey=exclusive_start_key
        )
    else:
        response = table.scan(
            FilterExpression='attribute_not_exists(exported)',
            Limit=100  # Увеличиваем количество записей до 100
        )
    return response

def main():
    connection = pymysql.connect(**db_params)
    exclusive_start_key = None

    while True:
        response = fetch_data_from_dynamodb(exclusive_start_key)
        items = response.get('Items', [])
        
        if not items:
            print("No more items to process.")
            break

        for item in items:
            insert_data_to_mariadb(item, connection)
            mark_data_as_exported(item['cruise_id'])
            print(f"Imported cruise {item['cruise_id']}")

        exclusive_start_key = response.get('LastEvaluatedKey', None)
        if not exclusive_start_key:
            break  # Прерываем цикл, если больше нет данных для обработки

    connection.close()

if __name__ == '__main__':
    main()