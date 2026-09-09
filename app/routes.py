from flask import Blueprint, render_template

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/blog')
def blog():
    return render_template('blog.html')

@main.route('/blog/<slug>')
def blog_details(slug):
    return render_template('blog-details.html')

@main.route('/servicos/<slug>')
def service_details(slug):
    return render_template('service-details.html')
