
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Render Django templates to static HTML files for Firebase Hosting'

    def handle(self, *args, **options):
        self.stdout.write('Building static site...')
        
        # 1. Render Index Page
        try:
            # Mock context usually provided by views
            context = {
                'db_connected': True, 
                'db_status': 'Static Build',
                'clear_stale_session': False
            }
            
            # Allow for template loading
            content = render_to_string('core/index.html', context)
            
            # Define output path in staticfiles
            output_path = os.path.join(settings.STATIC_ROOT, 'index.html')
            
            # Ensure staticfiles dir exists (collectstatic should have created it, but just in case)
            os.makedirs(settings.STATIC_ROOT, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            self.stdout.write(self.style.SUCCESS(f'Successfully built index.html'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error building index.html: {e}'))

        # You can add more pages here if needed
