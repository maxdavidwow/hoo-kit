import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainViewComponent } from './views/main-view/main-view.component';
import { TasksComponent } from './components/tasks/tasks.component';

const routes: Routes = [
	{ path: '', redirectTo: '/app/tasks', pathMatch: 'full' },
	{
		path: 'app',
		component: MainViewComponent,
		children: [
			{
				path: 'tasks',
				component: TasksComponent
			}
		]
	}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule {}
