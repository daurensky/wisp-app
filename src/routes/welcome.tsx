import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabsContent } from '@radix-ui/react-tabs'
import { useForm } from '@tanstack/react-form'
import { NavLink } from 'react-router'

export default function Welcome() {
  const form = useForm({
    defaultValues: {
      username: '',
    },
    onSubmit: async ({ value }) => {
      console.log(value)
    },
  })

  return (
    <>
      <aside className="bg-sidebar rounded-sm w-[300px]">
        <ul className="p-3 space-y-4">
          <li className="space-y-2">
            <NavLink to="/">
              {({ isActive }) => (
                <Button
                  variant={isActive ? 'secondary' : 'navlink'}
                  className="w-full justify-start"
                >
                  Друзья
                </Button>
              )}
            </NavLink>
          </li>
        </ul>
      </aside>

      <main className="flex flex-col flex-1 gap-2">
        <header className="bg-sidebar flex items-center gap-2 rounded-md">
          <div className="flex w-full items-center gap-2 px-4 py-2">
            <h1 className="text-base font-medium">Друзья</h1>
          </div>
        </header>

        <div className="flex flex-col gap-4 py-2">
          <Tabs defaultValue="all">
            <TabsList className="mb-2">
              <TabsTrigger value="all">В сети</TabsTrigger>
              <TabsTrigger value="add">Добавить в друзья</TabsTrigger>
            </TabsList>
            <TabsContent value="all">Все друзья</TabsContent>
            <TabsContent value="add">
              <form
                id="login-form"
                onSubmit={e => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <FieldGroup>
                  <FieldSet>
                    <FieldLegend>Добавить в друзья</FieldLegend>
                    <FieldDescription>
                      Вы можете добавить друзей по имени пользователя в Wisp
                    </FieldDescription>
                    <FieldGroup>
                      <form.Field
                        name="username"
                        children={field => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid

                          return (
                            <Field data-invalid={isInvalid}>
                              <div className="flex gap-4">
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={e =>
                                    field.handleChange(e.target.value)
                                  }
                                  aria-invalid={isInvalid}
                                />
                                <Button>Отправить запрос дружбы</Button>
                              </div>
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      />
                    </FieldGroup>
                  </FieldSet>
                </FieldGroup>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  )
}
